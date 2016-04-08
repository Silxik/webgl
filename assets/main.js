var doc = document, win = window, can, gl, pro = 2, ws, pls = [], rng = rnumgen(),
    key = [65, 68, 87, 83, 37, 39], act = new Uint8Array(key.length), mou = [0, 0, 0],
    meshes = [], texts = [], img = 3, tex = [], cam = {pos: [0, 0], foc: 0, cur: [0, 0]},
    R2D = 180 / Math.PI, D2R = Math.PI / 180;

function loadedCheck(e) {
    e.target.loaded = 1;
    var i = img.length;
    while (--i >= 0) {
        if (!img[i].loaded) return;
    }
    setupGL();

    setupPrograms();

    setupTextures();

    var ip = new GetIP();
    ip.onready = function() {
        connect(this.ip, 9300);
    }

}

function init() {
    var i = img;
    img = [];
    while (--i >= 0) {
        img[i] = new Image();
        img[i].id = i;
        img[i].src = "img/" + i + ".jpg";
        img[i].onload = loadedCheck;
    }
}

function run() {
    var i, j, k, m, p;
    // Only render when document has focus
    if (doc.hasFocus()) {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        i = meshes.length;
        if (i) {
            // Position camera
            cam.pos = meshes[cam.foc].pos;
            // Apply user interaction
            meshes[cam.foc].control();

            // Apply physics to meshes
            while (--i >= 0) {
                meshes[i].physics();
            }
            if (ws.connected) {
                ws.send('D ' + meshes[0].ang + ' ' +
                    meshes[0].pos[0] + ' ' + meshes[0].pos[1] + ' ' +
                    meshes[0].vel[0] + ' ' + meshes[0].vel[1]);

            }

            // Render programs
            i = pro.length;
            while (--i >= 0) {
                p = pro[i];
                gl.useProgram(p);
                j = p.meshes.length;
                if (j) {
                    gl.uniform2fv(p['uCam'], cam.pos);
                    while (--j >= 0) {
                        m = p.meshes[j];
                        if(p['uPos']) gl.uniform2fv(p['uPos'], m.pos);
                        gl.uniform1f(p['uAng'], m.ang);
                        gl.uniform3fv(p['uCol'], m.col);
                    gl.bindBuffer(gl.ARRAY_BUFFER, m.ver);
                    gl.vertexAttribPointer(p['aVer'], 2, gl.FLOAT, false, 0, 0);
                    
                    gl.bindBuffer(gl.ARRAY_BUFFER, m.tex);
                    gl.vertexAttribPointer(p['aTex'], 2, gl.FLOAT, false, 0, 0);
                        // Set texture for rendering
                        k = m.texUnits.length;
                        while (--k >= 0) {
                            gl.activeTexture(gl.TEXTURE0 + k);
                            gl.bindTexture(gl.TEXTURE_2D, tex[m.texUnits[k]]);
                        }
                        gl.drawArrays(gl.TRIANGLES, 0, 6);
                    }
                }
            }
        }
    }

    // Loop the run function
    requestAnimationFrame(run, can);
}

win.onload = init;