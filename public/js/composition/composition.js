document.addEventListener("DOMContentLoaded", function () {
    // Reuse the existing client from shared/supabaseClient.js.
    // Both files must be loaded as regular scripts, not modules.
    const db = window.supabaseClient ||
    (typeof supabase !== "undefined" && supabase.auth ? supabase : null);

    // The island opens this page as  composition.html?zone=2&level=3&island=6
    //   zone         = the zone (1-3). Every play asks QUESTIONS_PER_GAME questions picked at random from ALL
    //                  the zone's questions, whatever level they were written for. (level is not used.)
    //   island       = the level's number on the island (1-9). Only present when the island opened the page:
    //                  then the island pays the reward (coins, XP, cards) when the player goes back to it.
    const params = new URLSearchParams(location.search);
    const zone = Number(params.get("zone")) || 1;
    const QUESTIONS_PER_GAME = 8;
    const focusWord = params.get("focus") || "";   // set by a card's Practise button: one question with this word is always asked
    const islandLevel = Number(params.get("island")) || 0;
    const ISLAND_PAGE = "../island/island.html";
    const LOGIN_PAGE = "../auth/login.html";
    const RESULT_KEY = "island:minigame-result";   // read by js/island/miniGames.js
    // The questions are written per language. Only Chinese has any so far (stored as "zh-CN").
    const QUESTION_LANGUAGE = { zh: "zh-CN" };
    // ---- the bonus question: a sentence built ONLY from words the player captured (plus the few words every
    // ---- sentence needs). No decoy tiles: every tile is part of the answer.
    // Used only when the player has enough captured words that fit the zone (BONUS_MIN_WORDS), so a
    // new player just gets the usual 8 questions; otherwise 7 questions + 1 bonus.
    const BONUS_MIN_WORDS = 2;     // the sentence uses two captured words
    // A captured word is used only when its English meaning is on these lists: plain NOUNS that make a sensible
    // sentence in the zone. Anything else (a verb, a feeling, a person, a thing that does not belong there)
    // is left out, so the bonus question always makes sense. No bonus question beats a silly one.
    const BONUS_NOUNS = {
        // places near home
        1: new Set(["park", "playground", "supermarket", "shop", "market", "school", "library", "clinic", "hospital", "pharmacy", "bakery", "cafe", "coffee shop", "food court", "hawker centre", "bus stop", "mrt station", "void deck", "lift", "garden", "mall", "shopping mall", "restaurant", "bank", "post office", "kindergarten", "temple", "church", "mosque", "swimming pool", "gym", "basketball court", "fitness corner", "pavilion", "bench", "playground", "carpark", "car park", "minimart", "convenience store"]),
        // food and drink you can order
        2: /\b(rice|noodles?|tea|coffee|soup|juice|milk|water|satay|laksa|prata|dumplings?|chicken|egg|eggs|bread|cake|apple|orange|banana|mango|watermelon|papaya|durian|ice cream|porridge|congee|kopi|teh|toast|burger|pizza|fish ball|fish|duck|pork|beef)\b/,
        // things you can travel by
        3: new Set(["bus", "taxi", "train", "mrt", "subway", "plane", "airplane", "car", "ferry", "boat", "tram", "lrt", "school bus", "minibus", "cab"])
    };
    function bonusMeaningOk(meaning) {
        if (!meaning || /^to\s/i.test(meaning) || /\b(spicy|hot|cold|big|small|good|bad|very)\b/.test(meaning)) return false;
        const rule = BONUS_NOUNS[zone];
        if (!rule) return false;
        if (rule instanceof Set) return rule.has(meaning.replace(/^(a|an|the)\s+/, ""));
        return rule.test(meaning) && !/\b(stall|shop|centre|center|menu|order|eat|drink)\b/.test(meaning);
    }
    // Small words that carry no meaning of their own: never used as the player's word.
    const BONUS_FILLER = new Set(["的", "了", "是", "在", "和", "也", "都", "就", "着", "而", "及", "與", "我", "你", "他", "她", "它", "们", "这", "那", "不", "很", "个", "吗", "呢", "吧", "啊", "要", "想", "请", "有", "给", "坐", "骑", "一", "二", "三", "里", "上", "下", "喜欢", "可以"]);
    // The sentence frames. Both captured words go in the gaps (either order is accepted).
    // en() is the English the player follows along with.
    const BONUS_FRAMES = {
        1: [{ before: ["我家", "附近", "有"], between: "和", after: ["。"], en: function (a, b) { return "Near my home there is " + withArticle(a) + " and " + withArticle(b) + "."; } }],
        2: [{ before: ["我", "要"], between: "和", after: ["。"], en: function (a, b) { return "I want " + a + " and " + b + "."; } }],
        3: [{ before: [], between: "和", after: ["都", "可以", "坐", "。"], en: function (a, b) { return "I can take both the " + a + " and the " + b + "."; } }]
    };

    let player = null;       // the signed-in user
    let language = "zh";     // the player's Mother Tongue
    document.querySelector(".session-chip span").textContent = "Composition";

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
    let bonusRight = false;        // the bonus question was right first time
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
    // The bonus question
    // ----------------------------------

    function withArticle(meaning) {
        return /^(a|an|the)\s/i.test(meaning) ? meaning : (/^[aeiou]/i.test(meaning) ? "an " : "a ") + meaning;
    }

    function shuffleList(list) {
        const out = list.slice();
        for (let i = out.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const swap = out[i];
            out[i] = out[j];
            out[j] = swap;
        }
        return out;
    }

    // The player's own captured words that suit this zone. Never throws: with no captured words
    // (or no connection) the game simply has no bonus question.
    async function loadBonusWords() {
        if (!BONUS_NOUNS[zone] || !player || language !== "zh") return [];
        try {
            const result = await db
                .from("vocabulary")
                .select("vocab_id, word, romanization, english_meaning, theme, usage_count, evolution_stage")
                .eq("user_id", player.id)
                .eq("language", language)
                .limit(300);
            if (result.error) throw result.error;
            const seen = new Set();
            return (result.data || []).filter(function (row) {
                const meaning = String(row.english_meaning || "").split(/[\/;,(]/)[0].trim();
                if (!row.word || seen.has(row.word)) return false;
                if (!/^[\u4e00-\u9fff]{1,4}$/.test(row.word) || BONUS_FILLER.has(row.word)) return false;
                if (!/^[A-Za-z][A-Za-z '\-]{0,28}$/.test(meaning)) return false;
                if (!bonusMeaningOk(meaning.toLowerCase())) return false;
                row.simpleMeaning = meaning.toLowerCase().replace(/^(a|an|the)\s+/, "");
                seen.add(row.word);
                return true;
            });
        } catch (err) {
            console.warn("Composition: could not read the captured words, no bonus question.", err);
            return [];
        }
    }

    // One bonus question, or null when the player does not have enough fitting captured words.
    function makeBonusQuestion(words) {
        if (words.length < BONUS_MIN_WORDS) return null;
        const frames = BONUS_FRAMES[zone] || [];
        const frame = frames[Math.floor(Math.random() * frames.length)];
        if (!frame) return null;
        // the two words the player has practised least (ties are random)
        const pair = shuffleList(words).sort(function (a, b) { return (a.usage_count || 0) - (b.usage_count || 0); }).slice(0, 2);
        const a = pair[0];
        const b = pair[1];
        const build = function (x, y) { return frame.before.join("") + x.word + frame.between + y.word + frame.after.join(""); };
        const spelled = function (w) { return w.word + (w.romanization ? " (" + w.romanization + ")" : "") + " = " + w.simpleMeaning; };
        return {
            id: "bonus-" + a.vocab_id + "-" + b.vocab_id,
            bonus: true,
            bonusWords: [a.word, b.word],
            bonusMeanings: [a.simpleMeaning, b.simpleMeaning],
            prompt: "Bonus: arrange the words to say \u201C" + frame.en(a.simpleMeaning, b.simpleMeaning) + "\u201D",
            hint: "Use your own words: " + spelled(a) + "; " + spelled(b) + ".",
            tiles: frame.before.concat([a.word, frame.between, b.word], frame.after),
            accepted_answers: [build(a, b), build(b, a)],
            explanation: "Your words: " + a.word + " (" + a.simpleMeaning + ") and " + b.word + " (" + b.simpleMeaning + "): " + build(a, b),
            topic: ""
        };
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
                .eq("language", questionLanguage)
                .order("id");

            if (error) {
                throw new Error(
                    "Could not load questions: " + error.message
                );
            }

            if (!data || data.length === 0) {
                throw new Error(
                    "No questions found for zone " + zone + "."
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

            // A different set every time. Questions this player has not seen yet come first (random among
            // them); after that the ones seen longest ago. So a zone with only a few more questions than one
            // game uses still feels fresh from play to play.
            const seenKey = "composition:seen:" + (player ? player.id : "guest") + ":" + zone;
            let seenOrder = [];
            try { seenOrder = JSON.parse(localStorage.getItem(seenKey)) || []; } catch (err) { /* nothing remembered */ }
            const seenRank = new Map(seenOrder.map(function (id, i) { return [String(id), i]; }));
            const fresh = shuffleList(questions.filter(function (q) { return !seenRank.has(String(q.id)); }));
            const older = shuffleList(questions.filter(function (q) { return seenRank.has(String(q.id)); }))
                .sort(function (a, b) { return seenRank.get(String(a.id)) - seenRank.get(String(b.id)); });
            questions = fresh.concat(older);
            console.info("Composition: " + questions.length + " questions in this zone, " + fresh.length + " not seen yet; asking up to " + QUESTIONS_PER_GAME + ".");
            // Enough captured words that fit the zone: 7 questions + 1 bonus built from the player's own word.
            const bonus = makeBonusQuestion(await loadBonusWords());
            const normalCount = bonus && questions.length >= QUESTIONS_PER_GAME - 1 ? QUESTIONS_PER_GAME - 1 : QUESTIONS_PER_GAME;
            const all = questions;
            questions = all.slice(0, normalCount);
            if (focusWord && !questions.some(function (q) { return q.tiles.indexOf(focusWord) !== -1; })) {
                const withWord = all.filter(function (q) { return q.tiles.indexOf(focusWord) !== -1; });
                if (withWord.length) {
                    questions[Math.floor(Math.random() * questions.length)] = withWord[Math.floor(Math.random() * withWord.length)];
                }
            }
            questions = shuffleList(questions);   // the order of play is random too
            try {
                const chosen = questions.map(function (q) { return String(q.id); });
                localStorage.setItem(seenKey, JSON.stringify(seenOrder.filter(function (id) { return chosen.indexOf(String(id)) === -1; }).concat(chosen).slice(-400)));
            } catch (err) { /* private browsing: no memory, still random */ }
            // the bonus goes in at a random place among the questions
            if (bonus && normalCount === QUESTIONS_PER_GAME - 1) questions.splice(Math.floor(Math.random() * (questions.length + 1)), 0, bonus);

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

        questionHint.textContent = question.hint || (question.topic
            ? "Topic: " + question.topic
            : "Arrange the words in the correct order.");

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
            if (question.bonus) {
                bonusRight = true;   // the player's own words: they can evolve, but they are not zone cards
            } else {
                firstTryWords = firstTryWords.concat(question.tiles);
            }
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
        const bonusQuestion = questions.find(function (q) { return q.bonus; }) || null;

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
                // every word whose question was right first time: owned cards for them get +1 practice (they can evolve)
                right: firstTryWords.concat(bonusRight && bonusQuestion ? bonusQuestion.bonusWords : []),
                bonus: bonusQuestion ? { words: bonusQuestion.bonusWords, meanings: bonusQuestion.bonusMeanings, right: bonusRight } : null,
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