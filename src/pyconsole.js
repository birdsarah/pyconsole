"use strict";

let firstRun = true;
let tmpLog = [];
let inputHistory = [];
let historyCount = 0;
let scrollCount = 0;
let pyinput = document.getElementById('pyinput');
let input = document.getElementById('input-wrapper');

// Hijack console so we can print out print commands
if (typeof console !== "undefined") {
    console.logJack = console.log;
    console.log = function() {
        if (!firstRun) {
            let argArray = Array.prototype.slice.call(arguments);
            tmpLog.push(argArray);
        }
        console.logJack(...arguments);
    }
}

function submit() {
    let output = document.getElementById("output");
    let input = pyinput.value;

    // Setup output display
    let result = document.createElement('div');
    result.className = 'result';

    let displayInput = document.createElement('div');
    displayInput.className = 'display-input';
    displayInput.appendChild(document.createTextNode(input));

    result.appendChild(displayInput);

    // Run python
    try {
        let response = pyodide.runPython(input);
        // Display anything that was printed out
        if (tmpLog.length > 0) {
            tmpLog.forEach((item) => {
                let printOutput = document.createElement('pre');
                printOutput.className = 'display-output';
                printOutput.appendChild(document.createTextNode(item));
                result.appendChild(printOutput);
            })
            tmpLog = [];
        }
        // Print result of runPython
        if (response !== undefined) {
            let displayOutput = document.createElement('pre');
            displayOutput.className = 'display-output';
            displayOutput.appendChild(document.createTextNode(response));
            result.appendChild(displayOutput);
        }
    }
    catch(error) {
        let displayError = document.createElement('pre');
        displayError.className = 'display-output';
        displayError.appendChild(document.createTextNode(error.message));
        result.appendChild(displayError);
        // Errors also go to console.log so need to clear
        tmpLog = [];
    }

    // Display it
    output.appendChild(result);
    scrollCount = scrollCount + result.getBoundingClientRect().height;
    output.scrollTop = scrollCount;

    // Finally save and clear input so we can go again
    inputHistory.push(input);
    historyCount = 0;
    pyinput.value = '';
};


function arrowUp() {
    if ((historyCount <= 0) & (historyCount > inputHistory.length * -1)) {
        historyCount = historyCount - 1;
        pyinput.value = inputHistory[inputHistory.length + historyCount];
    }
    if (historyCount === 0) {
        pyinput.value = '';
    }
}


function arrowDown() {
    if (historyCount < 0) {
        historyCount = historyCount + 1;
        pyinput.value = inputHistory[inputHistory.length + historyCount];
    }
    if (historyCount === 0) {
        pyinput.value = '';
    }
}

pyinput.addEventListener('keyup', (event) => {
    if (event.which == 13) {
        firstRun = false;
        submit();
    }
    if (event.which == 38) {
        arrowUp();
    }
    if (event.which == 40) {
        arrowDown();
    }
});

pyinput.addEventListener('focus', (event) => {
    input.classList.add('active');
});

pyinput.addEventListener('blur', (event) => {
    input.classList.remove('active');
});
