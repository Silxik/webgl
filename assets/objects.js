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
        ts = ['', 'vec2', 'float', 'mat2', 'sampler2D'], i = 0;
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

Shader.prototype.mesh = function () {
    var t = this;
    t.add(0, 0, ['mediump float']);
    t.add(2, 1, ['vTex']);
    if (t.type) {
        t.add(4, 4, ['uImg']);
        t.add(5, 0, ['gl_FragColor = texture2D(uImg, vTex)']);
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
 * Random mesh.
 * @constructor
 */
function Mesh() {
    this.pos = [rnd() * 1000, rnd() * 360];
    this.vel = [rnd(), rnd()];
    this.ang = 0;
    this.avel = rnd();
    this.tver = [];
}

Mesh.prototype.pro = [0];
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
        
        glbuf(gl.ARRAY_BUFFER, this.ver);
        gl.enableVertexAttribArray(p['aVer']);
        gl.vertexAttribPointer(p['aVer'], 2, gl.FLOAT, false, 0, 0);

        glbuf(gl.ARRAY_BUFFER, this.tex);
        gl.enableVertexAttribArray(p['aTex']);
        gl.vertexAttribPointer(p['aTex'], 2, gl.FLOAT, false, 0, 0);

        gl.uniform1i(p['uImg'], 0);
    }
};

Mesh.prototype.render = function () {
    var i = pro.length, p;
    while (--i >= 0) {
        p = pro[i];
        gl.uniform2fv(p['uPos'], this.pos);
        gl.uniform1f(p['uAng'], this.ang);
        //gl.drawArrays(gl.LINES, 0, 6);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
};

Mesh.prototype.physics = function () {
    this.pos[0] += this.vel[0] / 60;
    this.pos[1] += this.vel[1] / 60;
    this.ang += this.avel;
};

Mesh.prototype.control = function () {
    this.vel[0] += act[1] - act[0];
    this.vel[1] += act[2] - act[3];
};