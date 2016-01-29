"use strict";
var doc = document, win = window, can, gl, pro, key = [65, 68, 87], act = [0, 0, 0],
    meshes = [new Triangle()];

function init() {
    setupGL();

    setupProgram();

    enableInput();

    run();
}

function run() {
    var i;

    // Only render when document has focus
    if (doc.hasFocus()) {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        // Render meshes
        i = meshes.length;
        while (--i >= 0) {
            meshes[i].render();
        }
    }
    // Loop the run function
    requestAnimationFrame(run, can);
}

win.onload = init;