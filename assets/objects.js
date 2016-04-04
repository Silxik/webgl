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
        gl.enableVertexAttribArray(p.aVer);
        gl.vertexAttribPointer(p.aVer, 2, gl.FLOAT, false, 0, 0);

        glbuf(gl.ARRAY_BUFFER, this.tex);
        gl.enableVertexAttribArray(p.aTex);
        gl.vertexAttribPointer(p.aTex, 2, gl.FLOAT, false, 0, 0);

        gl.uniform1i(p.uImg, 0);
    }
};

Mesh.prototype.render = function () {
    var i = pro.length, p;
    while (--i >= 0) {
        p = pro[i];
        gl.uniform2fv(p.uPos, this.pos);
        gl.uniform1f(p.uAng, this.ang);
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
}