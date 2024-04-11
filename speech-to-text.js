/*
 * @file speech-to-text.js
 * @authors Trent Repass, Nathan Klimt
 * @date 01/04/2024
 */
"use strict";

//Import SpeechRecognition Library
const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;
const SpeechGrammarList =
  window.SpeechGrammarList || window.webkitSpeechGrammarList;
const SpeechRecognitionEvent =
  window.SpeechRecognitionEvent || window.webkitSpeechRecognitionEvent;

//Creates an instance of "recognition" to use in the app
const recognition = new SpeechRecognition();

//Create an instance of speechSythesis
const synth = window.speechSynthesis;

var spokenOutput = document.querySelector(".spokenOutput");
var refHeader = document.querySelector(".refHeading");
var missedWordsStatement = document.querySelector(".missedWordsStatement");
var addedWordsStatement = document.querySelector(".addedWordsStatement");

//Raw data from user input
var spokenVerse = [];
//spokenVerse converted into a Java Script usable array
var spokenWords = [];
//spokenWords but all elements are converted to lower case for comparison
var spokenVerseWords = [];
//verseObj.words array but all elements are converted to lower case for comparison
var compareVerse = [];
//Array that tracks if words were missed in spoken response
var missedWords = [];
//Array that tracks if words were added in spoken response
var addedWords = [];

//Holds key:value pair of "index:punctuationChar" from verseObj.words to be added back into spokenVerseWords and compareVerse for comparison 
var punctDict = {};

var compareVerseLength = 0;
var spokenVerseWordsLength = 0;

//Variables used to dynamically create HTML spans to display verse words printed to screen
var currentSpanNumber = 0;
var currentSpan = "";

var verseObj = {
    ref:"John 3:16",
    text: "For God so loved the world that he gave his one and only son, that whoever believes in him shall not perish, but have eternal life.",
    words: []
};

startReviewButton.addEventListener("click", startReview);
startActivityButton.addEventListener("click", startActivity);
speakVerseButton.addEventListener("click", readVerse);
rulesButton.addEventListener("click", startRules);

function createWords(text) {
    var words = [];
    words = text.split(/\s*\b\s*/); 
    return words;
}

function readVerse() {
    var utterThis = new SpeechSynthesisUtterance(verseObj.text);
    synth.speak(utterThis);
}

function createGrammar(words) {
    return `#JSGF V1.0; grammar words; public <word> = ${words.join(" | ",)};`;
}

function startRules() {
    startActivityButton.removeAttribute("disabled");
    startReviewButton.removeAttribute("disabled");
    rulesDiv.classList.remove("hidden");
    activityDiv.classList.add("hidden");
    reviewDiv.classList.add("hidden");
    rulesButton.setAttribute("disabled", true);
    synth.cancel();
}

//When REVIEW VERSE button is clicked
function startReview() {
    //BUTTON LOGIC
	startReviewButton.setAttribute("disabled", true);
    startActivityButton.removeAttribute("disabled");
    rulesDiv.classList.add("hidden");
    rulesButton.removeAttribute("disabled");
    //BUTTON LOGIC

    //Displays verse and it's reference from verseObj on "review verse" screen
	refSpan.innerHTML = verseObj.ref;
	textSpan.innerHTML = verseObj.text;
    reviewDiv.classList.remove("hidden");

    wordDiv.innerHTML = "";
    spokenOutput.innerHTML = "";
    missedWordsStatement.innerHTML = "";
    addedWordsStatement.innerHTML = "";
    refHeader.innerHTML = "";
}

//When START button is clicked
function startActivity() {
    //BUTTON LOGIC
    reviewDiv.classList.add("hidden");
    activityDiv.classList.remove("hidden");
    startActivityButton.setAttribute("disabled", true);
    startReviewButton.setAttribute("disabled", true);
    resetActivityButton.removeAttribute("disabled");
    rulesButton.setAttribute("disabled", true);
    rulesDiv.classList.add("hidden");
    //BUTTON LOGIC

    synth.cancel();

    //Separates words from the starting verse into an array stored in verseObj.words array
    verseObj.words = createWords(verseObj.text);
    console.log("Initial words array: " + verseObj.words);

    //Clear word div when start button is pressed
    wordDiv.innerHTML = "";
    spokenOutput.innerHTML = "";
    missedWordsStatement.innerHTML = "";
    addedWordsStatement.innerHTML = "";
    refHeader.innerHTML = verseObj.ref;

    //Create list of spoken words we want to listen for
    const grammar = createGrammar(verseObj.words);
    console.log("grammar array: " + grammar);

    //Add list of words to listen for into the recognition list
    const speechRecognitionList = new SpeechGrammarList();
    speechRecognitionList.addFromString(grammar, 1);

    //Make recognition aware of list of words
    recognition.grammars = speechRecognitionList;

    //Set recognition properties
    recognition.continuous = true;
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.maxAlternatives = 2;

    //Clear variables before each run of loop, these get initialized in the for below so we need to reset them here 
    wordDiv.innerHTML = "";
    compareVerse = [];

    for (var i=0; i<verseObj.words.length; i++) {
        //Creates span HTML elements on screen dynamically based on how many elements are in verseObj.words array to be filled later 
		var span = document.createElement("span");
        span.innerHTML = verseObj.words[i];
		span.id = "span"+i;
		wordDiv.appendChild(span);
        span.classList.add("verseItemSpan");

        //Checks for punctuation marks in verseObj.words array so that they display and get added to punctDict dictionary
        if (verseObj.words[i] === ',' ||
            verseObj.words[i] === '\"' ||
            verseObj.words[i] === ", \"" ||
            verseObj.words[i] === '.' ||
            verseObj.words[i] === '.\"' ||
            verseObj.words[i] === '. \"' ||
            verseObj.words[i] === '(' ||
            verseObj.words[i] === '\" (' ||
            verseObj.words[i] === ')' ||
            verseObj.words[i] === ').' ||
            verseObj.words[i] === ')\"' ||
            verseObj.words[i] === '\").' ||
            verseObj.words[i] === ';' || 
            verseObj.words[i] === ':' ||
            verseObj.words[i] === ': \"' || 
            verseObj.words[i] === '?' ||
            verseObj.words[i] === '?\"' || 
            verseObj.words[i] === '!' || 
            verseObj.words[i] === '!\"') {
                span.classList.add("punct");
                span.classList.add("hidden");
                punctDict[i] = verseObj.words[i];
        } else {
            span.classList.add("notGuessed");
            compareVerse.push(verseObj.words[i].toLowerCase());
        }
    }

    console.log(punctDict);

    //Clear arrays before each run of speech recognition to allow for multiple subsequent runs of game loop
    spokenVerse = [];
    spokenWords = [];
    spokenVerseWords = [];
    missedWords = [];
    addedWords = [];

    //SPEECH STUFF
    recognition.onresult = (event) => {
        //Raw data from speech
        spokenVerse = event.results[0][0].transcript;

        //Convert said data into a JavaScript useable array
        spokenWords = spokenVerse.split(/\s*\b\s*/);

        //Dunamically writes spoken result to the screen
        spokenOutput.innerHTML = "Your Response: " + spokenWords.join(" ") + ".";
    };

    recognition.start();

    resetActivityButton.addEventListener("click", endActivity);
}

//When STOP button is clicked 
function endActivity() {
    //BUTTON LOGIC
    startActivityButton.removeAttribute("disabled");
    startReviewButton.removeAttribute("disabled");
    resetActivityButton.setAttribute("disabled", true);
    rulesButton.removeAttribute("disabled");
    //BUTTON LOGIC

    recognition.stop();

    //Convert spoken words array to lowercase
    for (var i=0; i<spokenWords.length; i++) {
        spokenVerseWords.push(spokenWords[i].toLowerCase());
    }

    spokenVerseWordsLength = spokenVerseWords.length;
    compareVerseLength = compareVerse.length; 

    //Spoken response is too short
    if (compareVerseLength > spokenVerseWordsLength) {
        for (var i = 0; i < (compareVerseLength - spokenVerseWordsLength); i++) {
            spokenVerseWords.push("x");
        } 
    }

    //Add punctuation back into spoken words array
    for(var key in punctDict){
        spokenVerseWords.splice(key, 0, punctDict[key]);
        compareVerse.splice(key, 0, punctDict[key]);
    }

    console.log("Compare verse array: " + compareVerse);
    console.log("Spoken words array: " + spokenVerseWords);

    currentSpanNumber = 0;
    currentSpan = "";

    for(var x = 0; x <= compareVerse.length-1; x++) {
        currentSpanNumber = x;
        currentSpan = document.querySelector("#span" + currentSpanNumber);
        if (compareVerse[x] === spokenVerseWords[x]) {
            currentSpan.classList.add("correctlyGuessed"); //GREEN - right word in right spot
        } else {
            if(!spokenVerseWords.includes(compareVerse[x])) {
                currentSpan.classList.add("missingWord"); //RED - wrong word completely
                missedWords.push(compareVerse[x]);
            }
            if(!compareVerse.includes(spokenVerseWords[x]) && spokenVerseWords[x] !== 'x'){
                addedWords.push(spokenVerseWords[x]);
            }
            currentSpan.classList.add("incorrectlyGuessed"); //YELLOW - word is in verse but in the wrong place
        }

        if (compareVerse[x] === ',' ||
            compareVerse[x] === '\"' ||
            compareVerse[x] === ", \"" ||
            compareVerse[x] === '.' ||
            compareVerse[x] === '.\"' ||
            compareVerse[x] === '. \"' ||
            compareVerse[x] === '(' ||
            compareVerse[x] === '\" (' ||
            compareVerse[x] === ')' ||
            compareVerse[x] === ').' ||
            compareVerse[x] === ')\"' ||
            compareVerse[x] === '\").' ||
            compareVerse[x] === ';' || 
            compareVerse[x] === ':' ||
            compareVerse[x] === ': \"' || 
            compareVerse[x] === '?' ||
            compareVerse[x] === '?\"' || 
            compareVerse[x] === '!' || 
            compareVerse[x] === '!\"') {
                currentSpan = document.getElementById("span" + currentSpanNumber);
                currentSpan.classList.remove("correctlyGuessed");
                currentSpan.classList.remove("hidden");
        }
    }
    
    spokenVerseWordsLength = spokenVerseWords.length;
    compareVerseLength = compareVerse.length; 

    if(spokenVerseWordsLength > compareVerseLength) {
        for(var i = compareVerseLength; i < spokenVerseWordsLength; i++){
            if(compareVerse.includes(spokenVerseWords[i])){
                continue;
            }
            addedWords.push(spokenVerseWords[i]);
        } 
    }
    
    if(missedWords.length == 1){
        missedWordsStatement.innerHTML = "Your response had 1 missing word: " + missedWords[0] + ".";
    }
    else if(missedWords.length > 1){ 
        missedWordsStatement.innerHTML = "Your response had " + missedWords.length + " missing words: " + "(" + missedWords.join(", ") + ").";
    }

    if(addedWords.length == 1){
        addedWordsStatement.innerHTML = "Your response had 1 added word: " + addedWords[0] + ".";
    }
    else if(addedWords.length > 1){ 
        addedWordsStatement.innerHTML = "Your response had " + addedWords.length + " added words: " + "(" + addedWords.join(", ") + ").";
    }
}