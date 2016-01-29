"use strict";
var doc = document, win = window, can, gl, prog, key = [65, 68, 87], act = [0, 0, 0],
    obj = {pos: [0, 0], ang: 0, vel: [0, 0], ver: [-50, -5, 50, 0, -50, 5]};

function init() {
    can = doc.getElementById('can');

    setupGL();

    setupProgram();

    enableInput();

    run();
}

function run() {
    // Only render when document has focus
    if (doc.hasFocus()) {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    }
    // Loop the run function
    requestAnimationFrame(run, can);
}

win.onload = init;