"use strict";
function rnd() {
    return 0.5 - Math.random();
}
function $(s) {
    return doc.getElementById(s);
}

function getLocations(program, type) {
    var i = gl.getProgramParameter(program, type ? gl.ACTIVE_UNIFORMS : gl.ACTIVE_ATTRIBUTES), u;
    while (--i >= 0) {
        u = type ? gl.getActiveUniform(program, i) : gl.getActiveAttrib(program, i);
        program[u.name] = type ? gl.getUniformLocation(program, u.name) : gl.getAttribLocation(program, u.name);
    }
}

function setupPrograms() {
    var i = pro, i2, p, sha = [new Shader(0).mesh(), new Shader(1).mesh()];
    pro = [];

    while (--i >= 0) {
        p = gl.createProgram();
        i2 = i * 2;
        gl.attachShader(p, sha[i2]);
        gl.attachShader(p, sha[i2 + 1]);
        gl.linkProgram(p);

        if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
            console.log('Unable to link the shader program: ' + gl.getProgramInfoLog(p));
        }
        getLocations(p, 1);
        getLocations(p, 0);

        p.meshes = [];
        pro[i] = p;
    }
}

function setupTextures() {
    var i = img.length, t;
    while (--i >= 0) {
        tex[i] = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex[i]);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

        // Send image data to graphics card
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img[i]);

        gl.generateMipmap(gl.TEXTURE_2D);
    }
}

function setupGL() {
    can = doc.getElementById('can');
    try {
        gl = can.getContext('webgl') || can.getContext('experimental-webgl');
    } catch (e) {
        console.log('Error getting WebGL context:', e);
    }
    if (!gl) {
        alert('Unable to initialize WebGL');
        return false;
    }
    gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Clear to black, fully opaque
    gl.clearDepth(1.0);                 // Clear everything
    gl.enable(gl.DEPTH_TEST);           // Enable depth testing
    gl.depthFunc(gl.LEQUAL);            // Near things obscure far things

    // Enable alpha blending
    gl.enable(gl.BLEND);
    gl.blendEquation(gl.FUNC_ADD);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    return true;
}

function enableInput() {
    // Disable context menu
    can.oncontextmenu = function (e) {
        return false;
    };

    // Enable keyboard input detection
    win.onkeydown = win.onkeyup = function (e) {
        var i = key.length, k = e.which, d;
        while (--i >= 0) {
            if (k == key[i]) {
                d = e.type == 'keydown';
                act[i] = d ? 1 : 0;
                if (k == 37 && d) cam.foc = cam.foc == 0 ? meshes.length - 1 : cam.foc - 1;
                if (k == 39 && d) cam.foc = cam.foc == meshes.length - 1 ? 0 : cam.foc + 1;
                break;
            }
        }
    };

    // Enable window responsiveness
    win.onresize = function () {
        var w = can.width = win.innerWidth,
            h = can.height = win.innerHeight,
            i = pro.length, p;
        gl.viewport(0, 0, w, h);

        while (--i >= 0) {
            p = pro[i];
            gl.useProgram(p);
            gl.uniform2f(p['uRes'], 2 / w, 2 / h);
        }
    };

    win.onmousedown = function (e) {
        mou[e.which] = 1;
    };

    win.onmousemove = function (e) {
        var dx = e.clientX - cam.cur[0], dy = e.clientY - cam.cur[1];

        cam.cur[0] += dx;
        cam.cur[1] += dy;

        meshes[0].ang = -R2D * Math.atan2(cam.cur[0] - can.width / 2, cam.cur[1] - can.height / 2);

    };
    win.onmouseup = function (e) {
        mou[e.which] = 0;
    };
    

    // Initial resize
    win.onresize();
}

function glbuf(type, data) {
    var b = gl.createBuffer();
    gl.bindBuffer(type, b);
    gl.bufferData(type, data, gl.STATIC_DRAW);
    return b
}

function connect(ip, port) {
    ws = new WebSocket('ws://' + ip + ':' + port);
    console.log('Connecting to ' + ip + ':' + port + '...');
    ws.onopen = function () {
        var sid = (Math.random() * 10000 << 0) + '';
        console.log('Connected');
        pls.push(new Player(sid));
        ws.send('J ' + sid);
        enableInput();
        run();
        ws.connected = true;
    };
    ws.onmessage = function (a) {
        var d = a.data, s = d.split(' '), c = s.shift(), i, j, l = s.length, m;
        if (c == 'S') {
            console.log('Server: ' + s.join(' '));
        } else if (c == 'D') {
            j = pls.length;
            for (i = 0; i < l; i += 6) {    // Every iteration is a new player
                while (--j >= 0) {
                    if (pls[j].sid == s[i]) {
                        m = pls[j].mesh;
                        m.ang = parseFloat(s[i + 1]);
                        m.pos[0] = parseFloat(s[i + 2]);
                        m.pos[1] = parseFloat(s[i + 3]);
                        m.vel[0] = parseFloat(s[i + 4]);
                        m.vel[1] = parseFloat(s[i + 5]);
                        break;
                    }
                }
            }
        } else if (c == 'J') {
            console.log(s[0], ' joined.');
            pls.push(new Player(s[0]));
        } else if (c == 'Q') {
            console.log(s[0] + ' quit.');
            removePlayer(s[0]);
        } else if (c == 'U') {
            if (s[0] == '') return;
            while (--l >= 0) {
                pls.push(new Player(s[l]));
            }
        }
    };
    ws.onclose = function () {
        ws.connected = false;
        console.log('Disconnected');
    };
}

function removePlayer(sid) {
    var i = pls.length, j, mid, msh, pm, pid;
    while (--i >= 0) {
        if (pls[i].sid == sid) {
            msh = pls[i].mesh;
            mid = meshes.indexOf(msh);
            j = msh.pro.length;
            while (--j >= 0) {  // Delete from programs
                pm = pro[msh.pro[j]].meshes;
                pid = pm.indexOf(msh);
                if (pid >= 0) {     // Program contains mesh
                    safeRemove(pm, pid);
                }
            }
            safeRemove(meshes, mid);    // Delete from mesh list
            pls.splice(i, 1);   // Remove from players list
        }
    }
}

function safeRemove(arr, ind) {
    var l = arr.length - 1;
    if (ind != l) {  // Not the last element in the list
        arr[ind] = arr[l];    // Replace with last element
    }
    arr.pop();   // Remove last
}