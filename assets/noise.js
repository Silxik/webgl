function drawBG(gl,type,texW, texH, hex1, hex2){
    function hex2rgb(hex){
        if(hex[0]=="#") hex=hex.substr(1);
        if(hex.length==3){
            var temp=hex; hex='';
            temp = /^([a-f0-9])([a-f0-9])([a-f0-9])$/i.exec(temp).slice(1);
            for(var i=0;i<3;i++){hex+=temp[i]+temp[i]};
        }
        var triplets = /^([a-f0-9]{2})([a-f0-9]{2})([a-f0-9]{2})$/i.exec(hex).slice(1);
        return [parseInt(triplets[0],16), parseInt(triplets[1],16), parseInt(triplets[2],16)];
    }

    function textureFromPixelArray(data) {
        var image = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D,image);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,texW,texH,0,gl.RGBA,gl.UNSIGNED_BYTE,data);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        console.log(data);
        return image;
    }

    if(type=='simplex'){
        var noise = {};

        function Grad(x, y, z){
            this.x = x; this.y = y; this.z = z;
        }

        Grad.prototype.dot2 = function(x, y){
            return this.x*x + this.y*y;
        };

        Grad.prototype.dot3 = function(x, y, z){
            return this.x*x + this.y*y + this.z*z;
        };

        var grad3 = [new Grad(1,1,0),new Grad(-1,1,0),new Grad(1,-1,0),new Grad(-1,-1,0),
                     new Grad(1,0,1),new Grad(-1,0,1),new Grad(1,0,-1),new Grad(-1,0,-1),
                     new Grad(0,1,1),new Grad(0,-1,1),new Grad(0,1,-1),new Grad(0,-1,-1)];

        var p = [151,160,137,91,90,15,
        131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,
        190, 6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,
        88,237,149,56,87,174,20,125,136,171,168, 68,175,74,165,71,134,139,48,27,166,
        77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,
        102,143,54, 65,25,63,161, 1,216,80,73,209,76,132,187,208, 89,18,169,200,196,
        135,130,116,188,159,86,164,100,109,198,173,186, 3,64,52,217,226,250,124,123,
        5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,
        223,183,170,213,119,248,152, 2,44,154,163, 70,221,153,101,155,167, 43,172,9,
        129,22,39,253, 19,98,108,110,79,113,224,232,178,185, 112,104,218,246,97,228,
        251,34,242,193,238,210,144,12,191,179,162,241, 81,51,145,235,249,14,239,107,
        49,192,214, 31,181,199,106,157,184, 84,204,176,115,121,50,45,127, 4,150,254,
        138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180];
        // To remove the need for index wrapping, double the permutation table length
        var perm = new Array(512),
            gradP = new Array(512);

        // This isn't a very good seeding function, but it works ok. It supports 2^16
        // different seed values. Write something better if you need more seeds.
        noise.seed = function(seed){
            if(seed > 0 && seed < 1){
                // Scale the seed out
                seed *= 65536;
            }

            seed = Math.floor(seed);
            if(seed < 256){
                seed |= seed << 8;
            }

            for(var i = 0; i < 256; i++){
                var v;
                if(i & 1){
                    v = p[i] ^(seed & 255);
                }else{
                    v = p[i] ^((seed>>8) & 255);
                }

                perm[i] = perm[i + 256] = v,
                gradP[i] = gradP[i + 256] = grad3[v % 12];
            }
        };

        noise.seed(0);

        // Skewing and unskewing factors for 2, 3, and 4 dimensions
        var F2 = 0.5*(Math.sqrt(3)-1),
            G2 = (3-Math.sqrt(3))/6,
            F3 = 1/3,
            G3 = 1/6;

        noise.simplex2 = function(xin, yin){
            var n0, n1, n2; // Noise contributions from the three corners
            // Skew the input space to determine which simplex cell we're in
            var s = (xin+yin)*F2, // Hairy factor for 2D
                i = Math.floor(xin+s),
                j = Math.floor(yin+s),
                t = (i+j)*G2,
                x0 = xin-i+t, // The x,y distances from the cell origin, unskewed.
                y0 = yin-j+t;
            // For the 2D case, the simplex shape is an equilateral triangle.
            // Determine which simplex we are in.
            var i1, j1; // Offsets for second(middle) corner of simplex in(i,j) coords
            if(x0>y0){ // lower triangle, XY order:(0,0)->(1,0)->(1,1)
                i1=1; j1=0;
            }else{    // upper triangle, YX order:(0,0)->(0,1)->(1,1)
                i1=0; j1=1;
            }
            // A step of(1,0) in(i,j) means a step of(1-c,-c) in(x,y), and
            // a step of(0,1) in(i,j) means a step of(-c,1-c) in(x,y), where
            // c = (3-sqrt(3))/6
            var x1 = x0 - i1 + G2, // Offsets for middle corner in(x,y) unskewed coords
                y1 = y0 - j1 + G2,
                x2 = x0 - 1 + 2 * G2, // Offsets for last corner in(x,y) unskewed coords
                y2 = y0 - 1 + 2 * G2;
            // Work out the hashed gradient indices of the three simplex corners
            i &= 255;
            j &= 255;
            var gi0 = gradP[i+perm[j]],
                gi1 = gradP[i+i1+perm[j+j1]],
                gi2 = gradP[i+1+perm[j+1]];
            // Calculate the contribution from the three corners
            var t0 = 0.5 - x0*x0-y0*y0;
            if(t0<0){
                n0 = 0;
            }else{
                t0 *= t0;
                n0 = t0 * t0 * gi0.dot2(x0, y0);  //(x,y) of grad3 used for 2D gradient
            }
            var t1 = 0.5 - x1*x1-y1*y1;
            if(t1<0){
                n1 = 0;
            }else{
                t1 *= t1;
                n1 = t1 * t1 * gi1.dot2(x1, y1);
            }
            var t2 = 0.5 - x2*x2-y2*y2;
            if(t2<0){
                n2 = 0;
            }else{
                t2 *= t2;
                n2 = t2 * t2 * gi2.dot2(x2, y2);
            }
            // Add contributions from each corner to get the final noise value.
            // The result is scaled to return values in the interval [-1,1].
            return 70 *(n0 + n1 + n2);
        };

        var data = new Uint8Array(texW*texH*4),
            col1=hex2rgb(hex1),
            col2=hex2rgb(hex2);
        noise.seed(Math.random());
        for(var x = 0; x < texW; x++){
            for(var y = 0; y < texH; y++){
                var value = Math.abs(noise.simplex2(x / 100, y / 100));
                value*=255;

                var cell = (x + y * texW) * 4;

                data[cell] = value*(col1[0]/256) + Math.max(0,(25 - value) * 8)*(col2[0]/256);
                data[cell + 1] = value*(col1[1]/256) + Math.max(0,(25 - value) * 8)*(col2[1]/256);
                data[cell + 2] = value*(col1[2]/256) + Math.max(0,(25 - value) * 8)*(col2[2]/256);
                data[cell + 3] = 255;
            }
        }
        var simplexTex = textureFromPixelArray(data);
        return simplexTex;
    }else if(type=='perlin'){
        var UFX = UFX || {}

        // The basic function that returns noise at a given position in n-space.
        // This a slow, general reference implementation. Most calls should use a faster function
        //   that computes many values at once.
        UFX.noise = function (p, wrapsize) {
            var n = p.length
            var q = new Array(n)  // coordinates of lattice points on all sides of the given point
            var a = new Array(n)  // distance to lower lattice point
            for (var j = 0 ; j < n ; ++j) {
                var w = wrapsize ? wrapsize[j] : 256
                var i = Math.floor(p[j]) % w
                if (i < 0) i += w
                q[j] = [i, (i+1) % w]
                a[j] = p[j] - Math.floor(p[j])
            }
            var r = 0  // return value
            // Loop through the 2^n lattice points bordering this point
            for (var k = 0, kmax = 1 << n ; k < kmax ; ++k) {
                var v = new Array(n)
                for (var j = 0 ; j < n ; ++j) {
                    v[j] = q[j][(k >> j) & 1]
                }
                var dprod = 0, cprod = 1
                for (var j = 0 ; j < n ; ++j) {
                    var g = UFX.noise._gvalue(v, j)  // the j-th component of the gradient
                    var t = ((k >> j) & 1) ? 1 - a[j] : -a[j]  // distance along the j-axis to lattice point
                    dprod += g * t  // dot product sum
                    cprod *= 1 - t * t * (3 - 2 * Math.abs(t))  // cross-fade factor
                }
                r += dprod * cprod
            }
            return r / 1000. / Math.sqrt(n)
        }

        // A tileable 2d noise map
        UFX.noise.wrap2d = function (s, ngrid, soff, noff) {
            var sx = s[0], sy = s[1], size = sx * sy
            var val = new Array(size)
            var gx0 = new Array(sx), gx1 = new Array(sx)
            var ax = new Array(sx), bx = new Array(sx), cax = new Array(sx), cbx = new Array(sx)
            ngrid = ngrid || [8, 8]
            var nx = ngrid[0], ny = ngrid[1], n = nx * ny
            noff = noff || [0, 0]
            var gradx = new Array(n), grady = new Array(n)
            for (var gy = 0, gj = 0 ; gy < ny ; ++gy) {
                for (var gx = 0 ; gx < nx ; ++gx, ++gj) {
                    gradx[gj] = UFX.noise._gvalue([gx + noff[0], gy + noff[1]], 0)
                    grady[gj] = UFX.noise._gvalue([gx + noff[0], gy + noff[1]], 1)
                }
            }
            soff = soff || [0, 0]
            for (var px = 0 ; px < sx ; ++px) {
                var x = (px + 0.5) * nx / sx + soff[0]
                gx0[px] = Math.floor(x) % nx
                if (gx0[px] < 0) gx0[px] += nx
                gx1[px] = (gx0[px] + 1) % nx
                var axj = x - Math.floor(x), bxj = 1 - axj
                ax[px] = axj
                bx[px] = bxj
                cax[px] = axj*axj*(3-2*axj)
                cbx[px] = 1 - cax[px]
            }
            for (var py = 0, pj = 0 ; py < sy ; ++py) {
                var y = (py + 0.5) * ny / sy + soff[1]
                var gy0j = Math.floor(y) % ny
                if (gy0j < 0) gy0j += ny
                var gy1j = (gy0j + 1) % ny
                var ayj = y - Math.floor(y), byj = 1 - ayj
                var cayj = ayj*ayj*(3-2*ayj), cbyj = 1 - cayj
                for (var px = 0 ; px < sx ; ++px, ++pj) {
                    var gx0j = gx0[px], gx1j = gx1[px]
                    var axj = ax[px], bxj = bx[px], caxj = cax[px], cbxj = cbx[px]
                    var j00 = gx0j + gy0j * nx, j01 = gx0j + gy1j * nx
                    var j10 = gx1j + gy0j * nx, j11 = gx1j + gy1j * nx
                    val[pj] = ((-axj*gradx[j00] - ayj*grady[j00]) * cbyj +
                               (-axj*gradx[j01] + byj*grady[j01]) * cayj) * cbxj +
                              (( bxj*gradx[j10] - ayj*grady[j10]) * cbyj +
                               ( bxj*gradx[j11] + byj*grady[j11]) * cayj) * caxj
                    val[pj] /= 1414.213
                }
            }
            return val
        }

        // 256 values in a Gaussian normal distribution (multiplied by 1000 for convenience)
        // >>> a = [math.sqrt(2) * scipy.special.erfinv((0.5 + j) / 128. - 1.) for j in range(256)]
        // >>> ",".join([str(int(x*1000)) for x in a])
        UFX.noise._grad = [-2885,-2520,-2335,-2206,-2106,-2024,-1953,-1891,-1835,-1785,-1739,-1696,-1656,
          -1618,-1583,-1550,-1518,-1488,-1459,-1431,-1404,-1378,-1353,-1329,-1306,-1283,-1261,-1240,-1219,
          -1199,-1179,-1159,-1140,-1122,-1104,-1086,-1068,-1051,-1034,-1018,-1001,-985,-970,-954,-939,-924,
          -909,-894,-879,-865,-851,-837,-823,-809,-796,-783,-769,-756,-743,-730,-718,-705,-693,-680,-668,
          -656,-644,-632,-620,-608,-596,-584,-573,-561,-550,-539,-527,-516,-505,-494,-483,-472,-461,-450,
          -439,-428,-418,-407,-396,-386,-375,-365,-354,-344,-334,-323,-313,-303,-292,-282,-272,-262,-252,
          -242,-232,-222,-212,-202,-192,-182,-172,-162,-152,-142,-132,-122,-112,-102,-93,-83,-73,-63,-53,
          -44,-34,-24,-14,-4,4,14,24,34,44,53,63,73,83,93,102,112,122,132,142,152,162,172,182,192,202,212,
          222,232,242,252,262,272,282,292,303,313,323,334,344,354,365,375,386,396,407,418,428,439,450,461,
          472,483,494,505,516,527,539,550,561,573,584,596,608,620,632,644,656,668,680,693,705,718,730,743,
          756,769,783,796,809,823,837,851,865,879,894,909,924,939,954,970,985,1001,1018,1034,1051,1068,1086,
          1104,1122,1140,1159,1179,1199,1219,1240,1261,1283,1306,1329,1353,1378,1404,1431,1459,1488,1518,
          1550,1583,1618,1656,1696,1739,1785,1835,1891,1953,2024,2106,2206,2335,2520,2885]
        // A random permutation of [0,256)
        UFX.noise._perm = []
        var p = [];
        for (var i = 0; i < 256; i++) {
         p[i] = Math.floor(Math.random() * 256);
        }
        for(var i = 0; i < 512; i++) {
         UFX.noise._perm[i] = p[i & 255];
        }
        // Use the permutation to convert an vector of indices into a gradient value
        UFX.noise._gvalue = function (v, n) {
            var i = UFX.noise._perm[n]
            for (var j = 0 ; j < v.length ; ++j) i = UFX.noise._perm[(i + v[j]) & 255]
            return UFX.noise._grad[i]
        }

        function drawNoise(n, b) {
            var buf = new ArrayBuffer(texW * texH * 4),
                b8 = new Uint8Array(buf),
                b32 = new Uint32Array(buf),
                c1=hex2rgb(hex1),
                c2=hex2rgb(hex2),
                x = texW, y = texH, yw, r, r2;
            while (--y >= 0) {
                yw = y * texW;
                x = texW;
                while (--x >= 0) {
                    r = b ? (0.5 + (n[yw + x] * 0.5)) : n[yw + x];
                    r = Math.abs(r - 0.5) * 2
                    r2 = (1 - r * 20) * (r <= 0.05);
                    b32[yw + x] =
                        (255 << 24) |// alpha
                        (r * c1[2] + r2 * c2[2] << 16) |// blue
                        (r * c1[1] + r2 * c2[1] << 8) |// green
                        r * c1[0] + r2 * c2[0];// red
                }
            }
            var perlinTex = textureFromPixelArray(b8);
            return perlinTex;
        }
        drawNoise(UFX.noise.wrap2d([texW, texH], [10, 10]), 1);

        // var texture = textureFromPixelArray(data);
        // return texture;
    }
}