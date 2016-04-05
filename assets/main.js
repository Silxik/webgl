var doc = document, win = window, can, gl, pro = 1,
    key = [65, 68, 87, 83, 37, 39], act = new Uint8Array(key.length),
    meshes = [], texts = [], img = 2, tex = [], cam = {pos: [0, 0], foc: 0};

function loadedCheck(e) {
    e.target.loaded = 1;
    var i = img.length;
    while (--i >= 0) {
        if (!img[i].loaded) return;
    }
    setupGL();

    setupPrograms();

    setupTextures();

    enableInput();
    var ip = win.prompt("insert ip to join", "192.168.1.");
    if (ip) {
        connect(ip, 9300);
    }

    run();
}

function init() {
    var i = 3;
    while (--i >= 0) {
        meshes[i] = new Mesh();
    }
    meshes[1].texUnits = [1];

    i = img;
    img = [];
    while (--i >= 0) {
        img[i] = new Image();
        img[i].id = i;
        img[i].src = "assets/img/" + i + ".jpg";
        img[i].onload = loadedCheck;
    }
}

function run() {
    var i, j, k, m, p;

    // Only render when document has focus
    if (doc.hasFocus()) {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // Position camera
        cam.pos = meshes[cam.foc].pos;
        // Apply user interaction
        meshes[cam.foc].control();

        // Apply physics to meshes
        i = meshes.length;
        while (--i >= 0) {
            meshes[i].physics();
        }

        // Render programs
        i = pro.length;
        while (--i >= 0) {
            p = pro[i];
            gl.useProgram(p);
            j = p.meshes.length;
            if (j > 0) gl.uniform2fv(p['uCam'], cam.pos);
            while (--j >= 0) {
                m = p.meshes[j];
                gl.uniform2fv(p['uPos'], m.pos);
                gl.uniform1f(p['uAng'], m.ang);
                // Define which texture we will render with
                k = m.texUnits.length;
                while (--k >= 0) {
                    gl.activeTexture(gl.TEXTURE0 + k);
                    gl.bindTexture(gl.TEXTURE_2D, tex[m.texUnits[k]]);
                }
                gl.drawArrays(gl.TRIANGLES, 0, 6);
            }
        }
    }

    // Loop the run function
    requestAnimationFrame(run, can);
}

win.onload = init;