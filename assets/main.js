var doc = document, win = window, can, gl, pro = [0], key = [65, 68, 87, 83, 37, 39], act = new Uint8Array(key.length),
    meshes = [], img, cam = {pos: [0, 0], foc: 0};

function init() {
    var i = 3;
    while (--i >= 0) {
        meshes[i] = new Mesh();
    }
    img = new Image();
    img.src = "assets/img/0.jpg";
    img.onload = function () {

        setupGL();

        setupProgram();

        setupTextures();

        enableInput();

        run();
    }
}

function run() {
    var i;

    // Only render when document has focus
    if (doc.hasFocus()) {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // Render meshes
        i = meshes.length;
        while (--i >= 0) {
            meshes[i].physics();
            cam.pos = meshes[cam.foc].pos;
            meshes[i].render();
        }
    }

    // Loop the run function
    requestAnimationFrame(run, can);
}

win.onload = init;