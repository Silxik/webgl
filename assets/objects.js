/**
 * A Random mesh.
 * @constructor
 */
function Mesh() {
    var i;
    this.pos = [rnd() * 1000, rnd() * 360];
    this.vel = [rnd(), rnd()];
    this.ang = 0;
    this.avel = rnd();
    this.tver = [];
}

Mesh.prototype.ver = new Float32Array([
    -100, -100, 100, -100, 100, 100,
    100, 100, -100, 100, -100, -100
]);

Mesh.prototype.tex = new Float32Array([
    0.0, 0.0, 1.0, 0.0, 1.0, 1.0,
    1.0, 1.0, 0.0, 1.0, 0.0, 0.0
]);

Mesh.prototype.setup = function () {
    var i = pro.length, p;
    while (--i >= 0) {
        p = pro[i];
        glbuf(gl.ARRAY_BUFFER, this.ver);
        gl.enableVertexAttribArray(p.aVer);
        gl.vertexAttribPointer(p.aVer, 2, gl.FLOAT, false, 0, 0);

        glbuf(gl.ARRAY_BUFFER, this.tex);
        gl.enableVertexAttribArray(p.aTex);
        gl.vertexAttribPointer(p.aTex, 2, gl.FLOAT, false, 0, 0);
    }
};

Mesh.prototype.render = function () {
    var i = pro.length, p;
    while (--i >= 0) {
        p = pro[i];
        gl.uniform2fv(p.uPos, this.pos);
        gl.uniform1f(p.uAng, this.ang);
        gl.uniform2fv(p.uCam, cam.pos);
        //gl.drawArrays(gl.LINES, 0, 6);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
};

Mesh.prototype.physics = function () {
    this.vel[0] += act[0] - act[1];
    this.vel[1] += act[3] - act[2];
    this.pos[0] += this.vel[0];
    this.pos[1] += this.vel[1];
    this.ang += this.avel;
};
