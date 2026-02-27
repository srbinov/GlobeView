# 3D Aircraft Models for Flight Detail Panel

When you click a plane on the globe, the detail panel shows a 3D model. You can use either:

- **A single GLB file**, or  
- **An OBJ pack** (`.obj` + `.mtl` + texture JPGs from a zip)

---

## Option A: OBJ pack (what you have)

If you have a zip with an **.obj file**, **.mtl file**, and **JPG textures**:

### 1. Create this folder in your project

```
public/models/airliner/
```

So the full path is: **`palantir2/public/models/airliner/`** (inside your repo).

### 2. Put the contents of the zip in that folder

- Copy **everything** from the zip into `public/models/airliner/`:
  - The **.obj** file (geometry)
  - The **.mtl** file (materials – references the JPGs)
  - All **.jpg** (or .png) texture files

### 3. Rename the main files so the app can find them

- Rename your **.obj** file to: **`airliner.obj`**
- Rename your **.mtl** file to: **`airliner.mtl`**

**Keep the texture filenames exactly as they are** (e.g. `fuselage.jpg`, `wings.jpg`, whatever the MTL expects). The .mtl file refers to those names; if you rename a JPG, the MTL won’t find it unless you edit the .mtl and change the filename there too.

### Example layout

Your folder should look like this:

```
public/models/airliner/
  airliner.obj    ← your .obj renamed to this
  airliner.mtl    ← your .mtl renamed to this
  texture1.jpg    ← same names as in the .mtl
  texture2.jpg
  (any other JPGs/PNGs the MTL references)
```

### If the plane faces the wrong way

The viewer expects the **nose along +Z** and **wings along X**. If your model is backwards or sideways, we can add a rotation in code (e.g. 180° around Y). Say so and we’ll adjust.

---

## Option B: Single GLB file

If you convert the model to **GLB** (e.g. in Blender: File → Export → glTF 2.0, then choose “glTF Binary (.glb)”):

- Put **one file** in: **`public/models/airliner.glb`**
- No folder needed; no MTL or JPGs.

The app tries **GLB first**, then **OBJ+MTL** if there’s no GLB.

---

## Size and orientation

- **Size:** The app auto-scales the model to fit the viewer. You don’t need to resize.
- **Orientation:** Nose = +Z, Y = up. If it’s wrong, we can add a rotation in `Aircraft3DViewer.jsx`.

---

## If no model is present

If neither a GLB nor the OBJ pack is in place (or loading fails), the app falls back to a **built-in procedural plane**. So the panel always shows something.
