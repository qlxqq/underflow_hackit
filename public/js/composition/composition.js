
document.addEventListener("DOMContentLoaded", function () {
    // Reuse the existing client from shared/supabaseClient.js.
    // Both files must be loaded as regular scripts, not modules.
    const db = window.supabaseClient;

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
    let earnedSessionXP = 0;
    let totalXP = 0;
    let completedQuestions = 0;
    let savingReward = false;

    // ----------------------------------
    // Load the player's existing XP
    // ----------------------------------

    async function loadPlayerXP() {
        const { data: authData, error: authError } =
            await db.auth.getUser();

        if (authError || !authData.user) {
            throw new Error("Please sign in to play composition.");
        }

        const { data, error } = await db
            .from("profiles")
            .select("xp")
            .eq("user_id", authData.user.id)
            .single();

        if (error) {
            throw new Error(
                "Could not load your profile: " + error.message
            );
        }

        totalXP = data.xp;
        updateXPDisplay();
    }

    function updateXPDisplay() {
        xpDisplay.textContent = totalXP + " XP";
        xpDisplay.title =
            "Total XP: " + totalXP +
            " | Earned this session: " + earnedSessionXP;
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
            await loadPlayerXP();

            const { data, error } = await db
                .from("composition_questions")
                .select(
                    "id, zone, level, topic, language, prompt, tiles, accepted_answers, explanation, xp"
                )
                .eq("zone", 1)
                .eq("level", 3)
                .eq("language", "zh-CN")
                .order("id");

            if (error) {
                throw new Error(
                    "Could not load questions: " + error.message
                );
            }

            if (!data || data.length === 0) {
                throw new Error(
                    "No questions found for zone 1, level 3, zh-CN."
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
            loadQuestion();
        } catch (error) {
            console.error("Composition loading error:", error);

            showError("Unable to start practice", error.message);
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
        savingReward = false;

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
        if (answered || savingReward) return;

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
            showFeedback(
                false,
                "Not quite!",
                question.explanation ||
                "Try rearranging the words and check again."
            );
            return;
        }

        // Lock the question before saving rewards.
        answered = true;
        savingReward = true;

        checkButton.disabled = true;
        resetButton.disabled = true;
        updateWordBank();

        saveReward(question);
    }

    // ----------------------------------
    // Award XP through Supabase
    // ----------------------------------

    async function saveReward(question) {
        const xp = Math.max(
            0,
            Math.min(500, Math.floor(Number(question.xp) || 0))
        );

        try {
            const { data, error } = await db.rpc("add_rewards", {
                p_xp: xp,
                p_coins: 0
            });

            if (error) {
                throw error;
            }

            if (!data || data.length === 0) {
                throw new Error(
                    "No reward result returned. Check your profile."
                );
            }

            totalXP = data[0].new_xp;
            earnedSessionXP += xp;
            completedQuestions++;

            updateXPDisplay();

            progressFill.style.width =
                (completedQuestions / questions.length * 100) + "%";

            showFeedback(
                true,
                "Correct! +" + xp + " XP",
                question.explanation ||
                "You arranged the sentence correctly."
            );

            checkButton.hidden = true;
            nextButton.hidden = false;

            nextButton.textContent =
                currentQuestionIndex === questions.length - 1
                    ? "Finish practice"
                    : "Next question →";
        } catch (error) {
            console.error("Could not save XP:", error);

            // The answer was correct, but the reward failed.
            // Do not allow repeated clicks to award duplicate XP.
            showFeedback(
                true,
                "Correct answer!",
                "However, your XP could not be saved. " +
                (error.message || "Please try again later.")
            );

            // Keep this question locked so that the player
            // cannot repeatedly submit it to farm rewards.
            nextButton.hidden = false;

            nextButton.textContent =
                currentQuestionIndex === questions.length - 1
                    ? "Finish practice"
                    : "Next question →";
        } finally {
            savingReward = false;
        }
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
        if (answered || savingReward || questions.length === 0) {
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
        if (!answered || savingReward) return;

        if (currentQuestionIndex < questions.length - 1) {
            currentQuestionIndex++;
            loadQuestion();
            return;
        }

        showCompletion();
    });

    function showCompletion() {
        questionPrompt.textContent = "Practice completed!";

        questionHint.textContent =
            "You've finished all the composition questions in this session.";

        questionCounter.textContent =
            questions.length + " of " + questions.length + " completed";

        progressFill.style.width = "100%";

        answerArea.replaceChildren();
        wordBank.replaceChildren();

        feedbackBox.hidden = false;
        feedbackBox.className = "feedback-box correct";

        feedbackIcon.textContent = "🏆";
        feedbackTitle.textContent = "Well done!";
        feedbackMessage.textContent =
            "You earned " + earnedSessionXP +
            " XP in this session. Your total is " + totalXP + " XP.";

        checkButton.hidden = true;
        nextButton.hidden = true;
        resetButton.hidden = true;
    }

    // Start the feature.
    loadQuestions();
});
