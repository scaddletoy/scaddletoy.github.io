// Portions of this file are Copyright 2021 Google LLC, and licensed under GPL2+. See COPYING.

export default `
/* [Meta] */
title = "OpenSCAD Demo";
show_text = true;
debug = true;

/* [Plate Settings] */
// Plate size (mm)
plate_size = 40;          // [20:1:80]
// Plate thickness
thickness  = 6;           // [2:0.5:20]
// Corner rounding
fillet     = 3;           // [0:0.5:10]

/* [Holes] */
// Number of holes
hole_count   = 6;         // [0:1:12]
// Hole diameter
hole_d       = 4;         // [2:0.5:10]
// Hole pattern
hole_pattern = "circle";  // ["circle", "grid"]

/* [Quality] */
$fs = $preview ? 1   : 0.2;
$fa = $preview ? 15  : 5;


/* ---------- Helpers ---------- */

module label(txt) {
    if (show_text)
        color("pink")
            translate([0, -plate_size/2 - 8, thickness])
                linear_extrude(1)
                    text(txt, size=6, halign="center");
}


/* ---------- Geometry ---------- */

module holes_2d() {
    if (hole_pattern == "circle")
        for (i = [0 : hole_count - 1])
            rotate(360 / hole_count * i)
                translate([plate_size / 3, 0])
                    circle(d = hole_d);
    else
        for (x = [-1, 0, 1], y = [-1, 0, 1])
            translate([x * plate_size / 4, y * plate_size / 4])
                circle(d = hole_d);
}

module plate_2d() {
    difference() {
        offset(r = fillet)
            square(plate_size - 2 * fillet, center = true);
        holes_2d();
    }
}


/* ---------- Output ---------- */

color("steelblue")
difference() {
    linear_extrude(thickness)
        plate_2d();

    // Debug cutaway
    if (debug)
        translate([0, 0, thickness/2])
            cube([plate_size, plate_size/2, thickness+1], center=true);
}

label(title);

`;
