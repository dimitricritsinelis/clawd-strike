"""Bake the approved R7 material recipes from their hash-checked licensed scans."""
from pathlib import Path
import argparse
import hashlib
import json
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / 'assets/source/bz04-shared-environment/materials'


def linear(value):
    return np.where(value <= .04045, value / 12.92, ((value + .055) / 1.055) ** 2.4)


def encoded(value):
    if not np.isfinite(value).all() or value.min() < 0 or value.max() > 1:
        raise ValueError('Derived material leaves the finite 0..1 color range')
    return np.rint(np.where(value <= .0031308, value * 12.92, 1.055 * value ** (1 / 2.4) - .055) * 255).astype(np.uint8)


def mirror_crop(pixels, crop, channel):
    x, y, X, Y = crop
    tile = pixels[y:Y, x:X].copy()
    right = tile[:, ::-1].copy()
    if channel == 'normal':
        right[:, :, 0] = 255 - right[:, :, 0]
    top = np.concatenate([tile, right], axis=1)
    bottom = top[::-1].copy()
    if channel == 'normal':
        bottom[:, :, 1] = 255 - bottom[:, :, 1]
    return np.concatenate([top, bottom], axis=0)


def bake(design):
    OUTPUT.mkdir(parents=True, exist_ok=True)
    result = {}
    for mid, entry in design['materials'].items():
        recipe = entry.get('baseColorRecipe')
        if not recipe:
            continue
        mode = recipe['mode']
        if mode not in {'bounded-linear-source-paint', 'crop-mirror-bounded-linear-source-paint', 'neutral-grain-with-calibrated-vertex-paint'}:
            raise ValueError(f'Unsupported material recipe: {mid}: {mode}')
        maps = {}
        for channel, relative in recipe['sourceFiles'].items():
            source = ROOT / relative
            if hashlib.sha256(source.read_bytes()).hexdigest() != recipe['sourceHashes'][channel]:
                raise ValueError(f'Licensed source hash changed: {relative}')
            pixels = np.asarray(Image.open(source).convert('RGB'))
            crop = entry.get('surfaceCropRecipe')
            if crop:
                if list(Image.open(source).size) != crop['sourceImageSizePx']:
                    raise ValueError(f'Crop source dimensions changed: {relative}')
                pixels = mirror_crop(pixels, crop['sourcePixelCropXYXY'], channel)
            if channel == 'albedo':
                source_linear = linear(pixels.astype(np.float64) / 255)
                grain = recipe['grainMix']
                if mode == 'neutral-grain-with-calibrated-vertex-paint':
                    gray = (1-grain) + grain * (source_linear @ np.array([.2126, .7152, .0722]))
                    pixels = encoded(np.repeat(gray[:, :, None], 3, axis=2))
                else:
                    pixels = encoded(np.array(recipe['paintLinear']) * ((1-grain) + grain*source_linear))
            target = OUTPUT / f"{recipe['exportName']}-{channel}.png"
            Image.fromarray(pixels).save(target)
            maps[channel] = str(target.relative_to(ROOT))
        result[mid] = {
            'id': recipe['exportName'], 'textures': maps,
            'sourceRecipeSha256': hashlib.sha256(json.dumps(entry, sort_keys=True).encode()).hexdigest(),
            'sha256': {k: hashlib.sha256((ROOT/v).read_bytes()).hexdigest() for k,v in maps.items()},
        }
    (OUTPUT / 'recipes.json').write_text(json.dumps(result, indent=2)+'\n')
    print(f'Baked {len(result)} hash-checked R7 material recipes')


def self_test():
    probe = np.array([0, .04045, .5, 1])
    assert np.max(np.abs(encoded(linear(probe)).astype(float)/255-probe)) <= .5/255
    pixels = np.array([[[10, 20, 30], [40, 50, 60]]], dtype=np.uint8)
    mirrored = mirror_crop(pixels, [0, 0, 2, 1], 'normal')
    assert mirrored.shape == (2, 4, 3)
    assert mirrored[0, 2].tolist() == [215, 50, 60]
    assert mirrored[1, 2].tolist() == [215, 205, 60]
    assert mirrored[0, 0].tolist() == [10, 20, 30]
    try:
        encoded(np.array([1.01]))
    except ValueError:
        pass
    else:
        raise AssertionError('Out-of-range paint accepted')
    print('PASS material fixtures: sRGB round trip, crop orientation, both normal mirrors, bounded paint')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--self-test', action='store_true')
    args = parser.parse_args()
    if args.self_test:
        self_test()
    else:
        bake(json.loads((ROOT/'docs/map-design/construction/design.json').read_text()))
