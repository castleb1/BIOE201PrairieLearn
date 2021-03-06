var _ = require("underscore");
var moment = require("moment-timezone");

var requireFrontend = require("./require-frontend");
var PrairieRandom = requireFrontend("PrairieRandom");

exports.getDefaultOptions = function() {
    return {
        questions: [],
        nQuestions: 20,
        autoCreateQuestions: true,
        allowQuestionSubmit: false,
        allowQuestionSave: true,
        allowFinish: true,
        hideQuestionTitleWhileOpen: true,
    };
};

exports.updateTest = function(test, options) {
    _.defaults(test, {
        scoresByUID: {},
        highScoresByUID: {},
        completeHighScoresByUID: {},
        scores: {},
        highScores: {},
        completeHighScores: {},
        questionInfo: {},
    });
    test.nQuestions = options.nQuestions;
    test.maxScore = options.nQuestions;
    test.maxQScoresByQID = _.chain(options.qidGroups)
        .flatten()
        .map(function(qid) {return [qid, 1];})
        .object()
        .value();
    test.qids = _(options.qidGroups).flatten();
    test.text = options.text;
    test._private = ["scoresByUID", "highScoresByUID", "completeHighScoresByUID"];
};

exports.updateTInstance = function(tInstance, test, options, questionDB) {
    if (_(tInstance).has('score') && !_(tInstance).has('scorePerc')) {
        // upgrade a score to a scorePerc, without applying credit limits
        tInstance.scorePerc = Math.floor(tInstance.score / test.maxScore * 100);
    }
    _(tInstance).defaults({
        scorePerc: 0,
    });
    if (tInstance.qids === undefined) {
        var qids = [];
        var rand = new PrairieRandom.RandomGenerator();
        var levelChoices = rand.randCategoryChoices(options.nQuestions, options.qidGroups.length);
        var iLevel, iType, typeChoices;
        for (iLevel = 0; iLevel < options.qidGroups.length; iLevel++) {
            typeChoices = rand.randCategoryChoices(levelChoices[iLevel], options.qidGroups[iLevel].length);
            for (iType = 0; iType < options.qidGroups[iLevel].length; iType++) {
                qids = qids.concat(rand.randNElem(typeChoices[iType], options.qidGroups[iLevel][iType]));
            }
        }
        var now = Date.now();
        tInstance.qids = qids;
        tInstance.createDate = new Date(now).toJSON(),
        tInstance.open = true,
        tInstance.submissionsByQid = {},
        tInstance.score = 0;
    }
    tInstance.questions = [];
    _(tInstance.qids).each(function(qid) {
        tInstance.questions.push({
            qid: qid,
            title: (questionDB[qid] && !tInstance.open) ? questionDB[qid].title : "No title",
        });
    });
    return tInstance;
};

exports.updateWithSubmission = function(tInstance, test, submission, options, callback) {
    if (!tInstance.open) {
        return callback(new Error("Test is not open"));
    }

    tInstance.submissionsByQid[submission.qid] = submission;
    submission._private = ["score", "trueAnswer", "oldTInstance", "oldTest", "newTInstance", "newTest"];
    callback(null);
};

exports.finish = function(tInstance, test) {
    if (!tInstance.open)
        throw Error("Test is already finished");

    var score = 0;
    var i, qid, submission, nAnswers = 0;
    for (i = 0; i < tInstance.qids.length; i++) {
        qid = tInstance.qids[i];
        submission = tInstance.submissionsByQid[qid];
        if (submission === undefined)
            continue;
        nAnswers++;
        if (test.questionInfo[qid] === undefined)
            test.questionInfo[qid] = {
                nAttempts: 0,
                nCorrect: 0,
            };
        test.questionInfo[qid].nAttempts++;
        if (submission.score >= 0.5) {
            score++;
            test.questionInfo[qid].nCorrect++;
        }
        delete submission._private;
    }
    var complete = (nAnswers === tInstance.qids.length);
    if (_(test.credit).isFinite() && test.credit > 0) {
        tInstance.finishDate = new Date().toJSON();
        tInstance.score = Math.min(score, test.maxScore);

        // compute the score as a percentage, applying credit bonus/limits
        newScorePerc = Math.floor(tInstance.score / test.maxScore * 100);
        if (test.credit < 100) {
            newScorePerc = Math.min(newScorePerc, test.credit);
        }
        if (test.credit > 100) {
            newScorePerc = Math.min(test.credit, Math.floor(newScorePerc * test.credit / 100));
        }
        tInstance.scorePerc = newScorePerc;
    }

    var uid = tInstance.uid;
    var sanitizedUID = uid.replace(/\./g, "_");
    if (test.scoresByUID[sanitizedUID] === undefined)
        test.scoresByUID[sanitizedUID] = [];
    test.scoresByUID[sanitizedUID].push(score);
    if (test.highScoresByUID[sanitizedUID] === undefined)
        test.highScoresByUID[sanitizedUID] = 0;
    test.highScoresByUID[sanitizedUID] = Math.max(score, test.highScoresByUID[sanitizedUID]);
    if (complete) {
        if (test.completeHighScoresByUID[sanitizedUID] === undefined)
            test.completeHighScoresByUID[sanitizedUID] = 0;
        test.completeHighScoresByUID[sanitizedUID] = Math.max(score, test.completeHighScoresByUID[sanitizedUID]);
    }

    test.scores = _.chain(test.scoresByUID).values().flatten().countBy().value();
    test.highScores = _.chain(test.highScoresByUID).values().countBy().value();
    test.completeHighScores = _.chain(test.completeHighScoresByUID).values().countBy().value();

    tInstance.open = false;
};
