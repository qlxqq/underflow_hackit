document.addEventListener("DOMContentLoaded", function () {
    // Reuse the existing client from shared/supabaseClient.js.
    // Both files must be loaded as regular scripts, not modules.
    const db = window.supabaseClient ||
    (typeof supabase !== "undefined" && supabase.auth ? supabase : null);

    // The island opens this page as  composition.html?zone=2&level=3&island=6
    //   zone / level = the zone (1-3) and the level inside it (1-3), which pick the questions
    //   island       = the level's number on the island (1-9). Only present when the island opened the page:
    //                  then the island pays the reward (coins, XP, cards) when the player goes back to it.
    const params = new URLSearchParams(location.search);
    const zone = Number(params.get("zone")) || 1;
    const level = Number(params.get("level")) || 3;
    const islandLevel = Number(params.get("island")) || 0;
    const ISLAND_PAGE = "../island/island.html";
    const LOGIN_PAGE = "../auth/login.html";
    const RESULT_KEY = "island:minigame-result";   // read by js/island/miniGames.js
    // The questions are written per language. Only Chinese has any so far (stored as "zh-CN").
    const QUESTION_LANGUAGE = { zh: "zh-CN" };
    let player = null;       // the signed-in user
    let language = "zh";     // the player's Mother Tongue
    document.querySelector(".session-chip span").textContent = "Level " + level + " · Composition";

    const questionPrompt = document.getElementById("questionPrompt");
    const questionHint = document.getElementById("questionHint");
    const answerArea = document.getElementById("answerArea");
    const wordBank = document.getElementById("wordBank");
    const emptyPlaceholder = document.getElementById("emptyPlaceholder");

    const questionCounter = document.getElementById("questionCounter");
    const progressFill = document.getElementById("progressFill");
    const xpDisplay = document.getElementById("xpDisplay");

    const checkButton = document.getElementById("checkButton");
    const resetButton = document.getElementById("resetButton");
    const nextButton = document.getElementById("nextButton");

    const feedbackBox = document.getElementById("feedbackBox");
    const feedbackIcon = document.getElementById("feedbackIcon");
    const feedbackTitle = document.getElementById("feedbackTitle");
    const feedbackMessage = document.getElementById("feedbackMessage");

    let questions = [];
    let currentQuestionIndex = 0;
    let selectedTiles = [];
    let answered = false;
    let completedQuestions = 0;
    let wrongTries = 0;            // wrong checks on the current question
    let firstTryCount = 0;         // questions got right on the first check: this is the score
    let firstTryWords = [];        // the words of those questions (they can win zone cards)
    let finished = false;
    let streakResult = null;       // set when this visit counted towards the daily streak
    let streakCounted = false;
    let returnUrl = ISLAND_PAGE;   // where the "back to the island" button goes

    // ----------------------------------
    // Who is playing, and in which language
    // ----------------------------------

    async function loadPlayer() {
        player = await getCurrentUser();   // js/shared/auth.js

        if (!player) {
            location.replace(LOGIN_PAGE);
            throw new Error("Please sign in to play composition.");
        }

        try {
            const code = localStorage.getItem("journeyLanguage:" + player.id);
            if (code === "zh" || code === "ms" || code === "ta") language = code;
        } catch (err) {
            // storage blocked: stay on Chinese
        }
        updateScoreDisplay();
    }

    // Playing counts towards the daily streak (once per visit; the streak itself grows once a day).
    async function countStreak() {
        if (streakCounted || !player || typeof recordStreakActivity !== "function") return;
        streakCounted = true;
        try {
            streakResult = await recordStreakActivity(player.id);   // js/shared/rewards.js
        } catch (err) {
            console.error("Could not update the streak:", err);
        }
    }

    // The badge in the top bar counts the questions got right first time.
    function updateScoreDisplay() {
        const total = questions.length || 0;
        xpDisplay.textContent = firstTryCount + (total ? "/" + total : "");
        xpDisplay.title = "Questions right on the first try";
    }

    // ----------------------------------
    // Fetch composition questions
    // ----------------------------------

    async function loadQuestions() {
        if (!db) {
            showError(
                "Supabase client not found",
                "Check the script paths in composition.html."
            );
            return;
        }

        setLoadingState();

        try {
            await loadPlayer();

            const questionLanguage = QUESTION_LANGUAGE[language];
            if (!questionLanguage) {
                throw new Error("Composition questions are not ready in this language yet.");
            }

            const { data, error } = await db
                .from("composition_questions")
                .select(
                    "id, zone, level, topic, language, prompt, tiles, accepted_answers, explanation, xp"
                )
                .eq("zone", zone)
                .eq("level", level)
                .eq("language", questionLanguage)
                .order("id");

            if (error) {
                throw new Error(
                    "Could not load questions: " + error.message
                );
            }

            if (!data || data.length === 0) {
                throw new Error(
                    "No questions found for zone " + zone + ", level " + level + "."
                );
            }

            // Validate the database data before rendering it.
            questions = data.filter(function (question) {
                return Array.isArray(question.tiles) &&
                    question.tiles.length > 0 &&
                    Array.isArray(question.accepted_answers) &&
                    question.accepted_answers.length > 0;
            });

            if (questions.length === 0) {
                throw new Error(
                    "The questions have missing or invalid tiles or answers."
                );
            }

            currentQuestionIndex = 0;
            updateScoreDisplay();
            loadQuestion();
        } catch (error) {
            console.error("Composition loading error:", error);

            showError("Unable to start practice", error.message);
            showBackToIsland("Back to the island");
        }
    }

    function setLoadingState() {
        questionPrompt.textContent = "Loading questions...";
        questionHint.textContent = "Connecting to your practice database.";

        checkButton.disabled = true;
        resetButton.disabled = true;
        nextButton.hidden = true;
    }

    // ----------------------------------
    // Render a question
    // ----------------------------------

    function loadQuestion() {
        const question = questions[currentQuestionIndex];

        selectedTiles = [];
        answered = false;
        wrongTries = 0;

        questionPrompt.textContent = question.prompt;

        questionHint.textContent = question.topic
            ? "Topic: " + question.topic
            : "Arrange the words in the correct order.";

        questionCounter.textContent =
            "Question " + (currentQuestionIndex + 1) +
            " of " + questions.length;

        progressFill.style.width =
            (completedQuestions / questions.length * 100) + "%";

        answerArea.replaceChildren();
        wordBank.replaceChildren();

        emptyPlaceholder.hidden = false;
        answerArea.appendChild(emptyPlaceholder);

        feedbackBox.hidden = true;
        feedbackBox.className = "feedback-box";

        checkButton.hidden = false;
        checkButton.disabled = false;

        resetButton.hidden = false;
        resetButton.disabled = false;

        nextButton.hidden = true;

        // Every tile has its own ID, so repeated words work correctly.
        const tiles = question.tiles.map(function (word, index) {
            return {
                id: index,
                word: word
            };
        });

        // Shuffle the tiles.
        for (let i = tiles.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));

            [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
        }

        tiles.forEach(function (item) {
            const button = document.createElement("button");

            button.type = "button";
            button.className = "word-tile";
            button.textContent = item.word;
            button.dataset.tileId = item.id;
            button.setAttribute(
                "aria-label",
                "Select word " + item.word
            );

            button.addEventListener("click", function () {
                if (answered) return;

                const alreadySelected = selectedTiles.some(
                    function (tile) {
                        return tile.id === item.id;
                    }
                );

                if (alreadySelected) return;

                selectedTiles.push(item);

                renderAnswer();
                updateWordBank();
            });

            wordBank.appendChild(button);
        });
    }

    // ----------------------------------
    // Render selected words
    // ----------------------------------

    function renderAnswer() {
        answerArea.replaceChildren();

        if (selectedTiles.length === 0) {
            emptyPlaceholder.hidden = false;
            answerArea.appendChild(emptyPlaceholder);
            return;
        }

        emptyPlaceholder.hidden = true;

        selectedTiles.forEach(function (item) {
            const button = document.createElement("button");

            button.type = "button";
            button.className = "word-tile answer-tile";
            button.textContent = item.word;
            button.title = "Click to remove this word";

            button.addEventListener("click", function () {
                if (answered) return;

                selectedTiles = selectedTiles.filter(
                    function (tile) {
                        return tile.id !== item.id;
                    }
                );

                renderAnswer();
                updateWordBank();
            });

            answerArea.appendChild(button);
        });
    }

    // ----------------------------------
    // Update available word tiles
    // ----------------------------------

    function updateWordBank() {
        const selectedIDs = selectedTiles.map(
            function (item) {
                return item.id;
            }
        );

        wordBank.querySelectorAll(".word-tile").forEach(
            function (button) {
                const isSelected = selectedIDs.includes(
                    Number(button.dataset.tileId)
                );

                button.disabled = isSelected || answered;
            }
        );
    }

    // ----------------------------------
    // Answer checking
    // ----------------------------------

    function normalizeSentence(sentence) {
        return sentence
            .normalize("NFC")
            .replace(/\s+/g, "")
            .trim();
    }

    function checkAnswer() {
        if (answered) return;

        if (selectedTiles.length === 0) {
            showFeedback(
                false,
                "Build your sentence first!",
                "Select words from the word bank."
            );
            return;
        }

        const question = questions[currentQuestionIndex];

        const userAnswer = normalizeSentence(
            selectedTiles.map(function (item) {
                return item.word;
            }).join("")
        );

        const acceptedAnswers = question.accepted_answers.map(
            function (answer) {
                return normalizeSentence(answer);
            }
        );

        const correct = acceptedAnswers.includes(userAnswer);

        if (!correct) {
            wrongTries++;
            showFeedback(
                false,
                "Not quite!",
                question.explanation ||
                "Try rearranging the words and check again."
            );
            return;
        }

        // Lock the question. No XP is paid here: the island pays one reward for the whole
        // level (coins, XP and cards) when the player goes back to it.
        answered = true;

        checkButton.disabled = true;
        resetButton.disabled = true;
        updateWordBank();

        countStreak();   // not awaited: the player is playing

        completedQuestions++;
        const firstTry = wrongTries === 0;
        if (firstTry) {
            firstTryCount++;
            firstTryWords = firstTryWords.concat(question.tiles);
        }
        updateScoreDisplay();

        progressFill.style.width =
            (completedQuestions / questions.length * 100) + "%";

        showFeedback(
            true,
            firstTry ? "Correct! First try" : "Correct!",
            question.explanation ||
            "You arranged the sentence correctly."
        );

        checkButton.hidden = true;
        nextButton.hidden = false;

        nextButton.textContent =
            currentQuestionIndex === questions.length - 1
                ? "Finish"
                : "Next question →";
    }

    // ----------------------------------
    // Feedback
    // ----------------------------------

    function showFeedback(correct, title, message) {
        feedbackBox.hidden = false;

        feedbackBox.className = correct
            ? "feedback-box correct"
            : "feedback-box incorrect";

        feedbackIcon.textContent = correct ? "✓" : "✕";
        feedbackTitle.textContent = title;
        feedbackMessage.textContent = message;
    }

    function showError(title, message) {
        questionPrompt.textContent = title;
        questionHint.textContent = message;

        wordBank.replaceChildren();
        answerArea.replaceChildren();

        feedbackBox.hidden = false;
        feedbackBox.className = "feedback-box incorrect";

        feedbackIcon.textContent = "!";
        feedbackTitle.textContent = title;
        feedbackMessage.textContent = message;

        questionCounter.textContent = "Unable to load";
        checkButton.disabled = true;
        resetButton.disabled = true;
        nextButton.hidden = true;
    }

    // ----------------------------------
    // Reset the current answer
    // ----------------------------------

    resetButton.addEventListener("click", function () {
        if (answered || questions.length === 0) {
            return;
        }

        selectedTiles = [];

        renderAnswer();
        updateWordBank();

        feedbackBox.hidden = true;
    });

    // ----------------------------------
    // Check button
    // ----------------------------------

    checkButton.addEventListener("click", function () {
        checkAnswer();
    });

    // ----------------------------------
    // Next question / completion
    // ----------------------------------

    nextButton.addEventListener("click", function () {
        if (finished) {
            location.href = returnUrl;
            return;
        }

        if (!answered) return;

        if (currentQuestionIndex < questions.length - 1) {
            currentQuestionIndex++;
            loadQuestion();
            return;
        }

        showCompletion();
    });

    async function showCompletion() {
        finished = true;
        await countStreak();   // (already counted at the first correct answer, this just makes sure)

        const total = questions.length;
        const ratio = total ? firstTryCount / total : 0;

        questionPrompt.textContent = "Practice completed!";

        questionHint.textContent = islandLevel
            ? "Go back to the island to collect your reward."
            : "You've finished all the composition questions in this session.";

        questionCounter.textContent = total + " of " + total + " completed";

        progressFill.style.width = "100%";

        answerArea.replaceChildren();
        wordBank.replaceChildren();

        // The finish screen shows only the result: hide the sentence builder and the intro text.
        [".answer-section", ".word-bank-section", ".subtitle", "main > h1"].forEach(function (selector) {
            const part = document.querySelector(selector);
            if (part) part.hidden = true;
        });

        feedbackBox.hidden = false;
        feedbackBox.className = "feedback-box correct";

        feedbackIcon.textContent = "🏆";
        feedbackTitle.textContent = "Well done!";
        feedbackMessage.textContent =
            "You got " + firstTryCount + " of " + total + " right on the first try." +
            (streakResult && streakResult.changed
                ? " " + (streakResult.currentStreak === 1 ? "Day 1 of your streak!" : streakResult.currentStreak + " day streak!")
                : "");

        checkButton.hidden = true;
        resetButton.hidden = true;

        // Hand the result to the island. It pays coins, XP and cards with its own rules
        // (less each time a level is replayed) and marks the level as done.
        if (islandLevel && player) {
            const result = {
                userId: player.id,
                level: islandLevel,
                language: language,
                ratio: ratio,
                total: total,
                words: firstTryWords,
                at: Date.now()
            };
            // Two ways to hand it over, in case one is blocked: saved on this device, and on the island's address.
            try {
                localStorage.setItem(RESULT_KEY, JSON.stringify(result));
            } catch (err) {
                console.error("Could not save the result for the island:", err);
            }
            returnUrl = ISLAND_PAGE + "?mg=" + encodeURIComponent(JSON.stringify(result));
        }

        showBackToIsland(islandLevel ? "Collect reward on the island →" : "Back to the island →");
    }

    // The Next button becomes the way back to the island.
    function showBackToIsland(text) {
        finished = true;
        nextButton.hidden = false;
        nextButton.textContent = text;
    }

    // Start the feature.
    loadQuestions();
});