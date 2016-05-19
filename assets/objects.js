/**
 * Shader builder and compiler
 * @constructor
 */
function Shader(type) {
    this.type = type;
    this.nodes = [[], [], [], [], [], []];
}

Shader.prototype.add = function (node, type, arr) {
    var ns = ['precision', 'const', 'varying', 'attribute', 'uniform', ''],
        ts = ['', 'vec2', 'float', 'mat2', 'sampler2D', 'vec3'], i = 0;
    for (; i < arr.length; i++) {
        this.nodes[node].push(ns[node] + ' ' + ts[type] + ' ' + arr[i] + ';');
    }
};

Shader.prototype.toStr = function () {
    var i = this.nodes.length, o = [];
    while (--i >= 0) {
        o[i] = this.nodes[i].join('');
    }
    o.splice(5, 0, 'void main(void) {');
    return o.join('') + '}';
};

Shader.prototype.bg = function () {
    var t = this;
    t.add(0, 0, ['mediump float']);
    t.add(2, 1, ['vTex']);
    if (t.type) {
        t.add(4, 1, ['uRes', 'uCam']);
        t.add(4, 4, ['uImg']);
        t.add(5, 0, ['gl_FragColor = texture2D(uImg, vTex + (uRes * uCam * 0.5))']);
    } else {
        t.add(3, 1, ['aTex', 'aVer']);
        t.add(4, 1, ['uRes']);
        t.add(5, 0, ['gl_Position = vec4((aVer), 1.0, 1.0)', 'vTex = aTex']);
    }
    return t.compile();
};

Shader.prototype.text = function () {
    var t = this;
    t.add(0, 0, ['mediump float']);
    t.add(2, 1, ['vTex']);
    if (t.type) {
        t.add(4, 4, ['uImg']);
        t.add(4, 5, ['uCol']);
        t.add(5, 0, ['gl_FragColor = texture2D(uImg, vec2(vTex.x, -vTex.y)) * vec4(uCol, 1)']);
    } else {
        t.add(1, 2, ['PI = 3.14159265358979323846264', 'D2R = PI / 180.0']);
        t.add(3, 1, ['aTex', 'aVer']);
        t.add(4, 1, ['uRes', 'uPos']);
        t.add(5, 0, ['gl_Position = vec4((aVer + uPos) * uRes, 1.0, 1.0)', 'vTex = aTex']);
    }
    return t.compile();
};

Shader.prototype.mesh = function () {
    var t = this;
    t.add(0, 0, ['mediump float']);
    t.add(2, 1, ['vTex']);
    if (t.type) {
        t.add(4, 4, ['uImg']);
        t.add(4, 5, ['uCol']);
        t.add(5, 0, ['gl_FragColor = texture2D(uImg, vTex) * vec4(uCol, 1)']);
    } else {
        t.add(1, 2, ['PI = 3.14159265358979323846264', 'D2R = PI / 180.0']);
        t.add(3, 1, ['aTex', 'aVer']);
        t.add(4, 1, ['uRes', 'uCam', 'uPos']);
        t.add(4, 2, ['uAng']);
        t.add(5, 2, ['rad = uAng * D2R', 'ac = cos(rad)', 'as = sin(rad)']);
        t.add(5, 3, ['rot = mat2(ac, -as, -as, -ac)']);
        t.add(5, 0, ['gl_Position = vec4((aVer * rot + uPos - uCam) * uRes, 1.0, 1.0)', 'vTex = aTex']);
    }
    return t.compile();
};

Shader.prototype.compile = function () {
    var s = gl.createShader(this.type ? gl.FRAGMENT_SHADER : gl.VERTEX_SHADER);
    gl.shaderSource(s, this.toStr());
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.log('Shader compile error: ' + gl.getShaderInfoLog(s));
        return false;
    }
    return s;
};

/**
 * Textnode constructor
 * @constructor
 */
function TextNode(str) {
    var mesh = new Mesh(),
        c = document.createElement('canvas'),
        ctx = c.getContext('2d'), width, t, w, h = 16, f = "24px Verdana",
        n2 = [32, 64, 128, 256, 512, 1024], i = n2.length;

    // Set font and measure text
    ctx.font = f;
    width = ctx.measureText(str).width;
    while (--i >= 0) {
        if (width <= n2[i]) w = n2[i] / 2;
    }

    c.width = w * 2;
    c.height = h * 2;

    //ctx.fillRect(0, 0, c.width, c.height);       // For debugging

    // Changing canvas size has reset some properties
    ctx.font = f;
    ctx.fillStyle = "white";

    ctx.fillText(str, 0, h + 4);

    mesh.pro = [0];
    mesh.pos = [0, 250];
    mesh.vel = [0, 0];
    mesh.ver = new Float32Array([
        -w, -h, w, -h, w, h,
        w, h, -w, h, -w, -h
    ]);

    mesh.setup();

    t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    // Send image data to graphics card
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);

    tex.push(t);
    mesh.texUnits = [tex.length - 1];
    meshes.push(mesh);
}

/**
 * Player constructor
 * @constructor
 */
function Player(sid) {
    this.sid = sid;
    rng.set(sid);
    var color = new Float32Array([0.1 + 0.9 * rng.get(), 0.1 + 0.9 * rng.get(), 0.1 + 0.9 * rng.get()]);
    this.mesh = new Mesh(color).setup();
    this.mesh.texUnits = [sid % 3];
}

/**
 * Random mesh.
 * @constructor
 */
function Mesh(color) {
    this.pos = [rnd() * 1000, rnd() * 360];
    this.vel = [rnd() * 10, rnd() * 10];
    this.ang = 0;
    this.col = color || new Float32Array([1, 1, 1]);
    this.avel = rnd();
    this.tver = [];
    meshes.push(this);
}

Mesh.prototype.pro = [1];
Mesh.prototype.type = 0;
Mesh.prototype.texUnits = [0];
Mesh.prototype.ver = new Float32Array([
    -100, -100, 100, -100, 100, 100,
    100, 100, -100, 100, -100, -100
]);

Mesh.prototype.tex = new Float32Array([
    0.0, 0.0, 1.0, 0.0, 1.0, 1.0,
    1.0, 1.0, 0.0, 1.0, 0.0, 0.0
]);

Mesh.prototype.setup = function () {
    var i = this.pro.length, p;
    while (--i >= 0) {
        p = pro[this.pro[i]];
        p.meshes.push(this);
        gl.useProgram(p);
        
        this.ver = glbuf(gl.ARRAY_BUFFER, this.ver);
        gl.enableVertexAttribArray(p['aVer']);
//         gl.vertexAttribPointer(p['aVer'], 2, gl.FLOAT, false, 0, 0);

        this.tex = glbuf(gl.ARRAY_BUFFER, this.tex);
        gl.enableVertexAttribArray(p['aTex']);
//         gl.vertexAttribPointer(p['aTex'], 2, gl.FLOAT, false, 0, 0);

        gl.uniform1i(p['uImg'], 0);
    }
    return this;
};

Mesh.prototype.physics = function () {
    this.pos[0] += this.vel[0] / 60;
    this.pos[1] += this.vel[1] / 60;
};

Mesh.prototype.control = function () {
    var ang = D2R * (meshes[0].ang - 90);
    this.vel[0] += act[1] - act[0];
    this.vel[1] += act[2] - act[3];
    if (mou[3]) {
        this.vel[0] += Math.sin(this.ang * D2R) * 5;
        this.vel[1] += Math.cos(this.ang * D2R) * 5;
    }
    this.vel[0] = this.vel[0] - this.vel[0] * act[6] * 0.05;
    this.vel[1] = this.vel[1] - this.vel[1] * act[6] * 0.05;
    if (mou[1]) {
        mou[1] += 1;
        if (mou[1] >= 10) {
            blt = new Mesh();
            blt.pos = meshes[0].pos.slice(0);
            blt.vel = [Math.cos(ang) * 300 + meshes[0].vel[0], -Math.sin(ang) * 300 + meshes[0].vel[1]];
            blt.ver = new Float32Array([
                -10.0, -10.0, 10.0, -10.0, 10.0, 10.0,
                10.0, 10.0, -10.0, 10.0, -10.0, -10.0
            ]);
            blt.setup();
            blt.type = 1;
            mou[1] = 1;
        }
    }

};

function rnumgen(n) {
    /*
     A seedable random number generator
     ~ 5 times slower than Math.random()

     s{integer}[optional] seed
     returns {object} the rng object
     */
    var i = 2147483647, s = n || Math.random();
    return {
        set: function (a) {
            s = a;
            this.get();
        },
        get: function () {
            s = s * 16807 % i;
            return s / i;
        }
    }
}