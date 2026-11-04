#!/usr/bin/env python3
"""Genere les badges pixel art (16x16) des Tags de serveur dans public/server-tag-badges/*.svg.
Sprites originaux, dessines pour ce projet. Usage : python3 scripts/generate-server-tag-badges.py"""
import os

PAL = {
  'k': '#1c1b22', 'w': '#ffffff', 's': '#b9bec9', 'S': '#6e7482',
  'g': '#5cbf4a', 'G': '#2f8a37', 'l': '#a5e36b',
  'r': '#e8453c', 'R': '#a32620', 'o': '#f08a24', 'O': '#b85a10', 'y': '#ffd23f', 'Y': '#d9a010',
  'b': '#4aa3f0', 'B': '#2459b8', 'c': '#8fe3ff', 'p': '#f06fae', 'P': '#a94fc9', 'd': '#6a3d9a',
  'n': '#8a5a35', 't': '#e6c79a', 'v': '#b9a4ff', 'V': '#7c64d8',
}

SPRITES = {
 'leaf': ["................","............kkkk","..........kkgggGk","........kkgggglGk","......kkgggglllGk",".....kgggglllGGGk","....kggggllGGGGk.","....kgggGGGGGGk..","...kgggGGGGGkk...","...kggGGGGkk.....","..kgGGGGkk.......",".kgGGkk..........","kgGkk............","kkk.............."," ................","................"],
 'sword': ["...............k","..............kwk",".............kwsk","............kwsk.","...........kwsk..","..........kwsk...","...k.....kwsk....","...kk...kwsk.....","....kk.kwsk......",".....kkwsk.......","......kyk........",".....kkykk.......","....nnk.kk.......","...nnk...........","..nnk............",".kkk............."],
 'heart': ["................","................","..kkkk....kkkk..",".kpppppkkpppppk.","kppwwppppppppppk","kpwwpppppppppppk","kppppppppppppppk","kpppppppppppppRk",".kppppppppppppRk","..kppppppppppRk.","...kppppppppRRk.","....kpppppppRk..",".....kppppRRk...","......kppRRk....",".......kkRk.....","........kk......"],
 'flame': ["................",".......k........","......kok.......","......koyk......",".....koyyk.k....",".k..kooyyokok...","kok.kooyyoook...","kook.oyywyook...","kooookoywwyok...","kooooooyywyok...","kooooooooyyok...",".koooooooooRk...",".kkooooooooRk...","...kkooooRRk....",".....kkkkkk.....","................"],
 'drop': ["................",".......k........","......kck.......","......kcbk......",".....kcbbk......",".....kcbbbk.....","....kcbbbbbk....","....kwcbbbbk....","...kwwcbbbbbk...","...kwcbbbbbBk...","...kcbbbbbbBk...","...kbbbbbbBBk...","....kbbbbBBk....",".....kBBBBk.....","......kkkk......","................"],
 'skull': ["................","....kkkkkkkk....","...kwwwwwwwwk...","..kwwwwwwwwwwk..","..kwwwwwwwwwwk..","..kwkkkwwkkkwk..","..kwkkkwwkkkwk..","..kwkkkwwkkkwk..","..kswwwkkwwwsk..","...kswwwwwwsk...","....kwkwkwkk....","....kwkwkwk.....","....kskskksk....",".....kkkkkk.....","................","................"],
 'moon': ["................","......kkkkk.....","....kkvvvvk.....","...kvvvVVk......","..kvvvVVk.......","..kvvvVk........",".kvvvVk.........",".kvvvVk.........",".kvvvVk.........",".kvvvVk.........","..kvvvVk........","..kvvvvVkk......","...kvvvvvVVkk...","....kkvvvvvVVk..",".....kkkkkkkkk..","................"],
 'bolt': ["................","........kkkk....",".......kyyyk....","......kyyyk.....",".....kyyyk......","....kyyyyyyk....","...kyyyyyyk.....",".....kyyYk......","....kyyYk.......","....kyYk........","...kyYk.........","...kYk..........","..kYk...........","..kk............","................","................"],
 'gem': ["................","................","...kkkkkkkkkk...","..kcwcbbbbbBBk..",".kcwcbbbbbbbBBk.","kccbbbbbbbbbBBBk","kkkkkkkkkkkkkkkk",".kbbbbbbbbbbBBk.","..kbbbbbbbbBBk..","...kbbbbbbBBk...","....kbbbbBBk....",".....kbbBBk.....","......kBBk......",".......kk.......","................","................"],
 'mushroom': ["................","....kkkkkkkk....","...krrwwrrrrk...","..krrwwwrrwwrk..",".krrrwwrrrwwwrk.",".krrrrrrrrrrrRk.",".kRrrrwwrrrrRRk.","..kkRRRRRRRRkk..","....kttttttk....","....ktttttsk....","....kttttttk....","....kttttsSk....",".....kkkkkk.....","................","................","................"],
 'planet': ["................","......kkkkk.....",".....kbbcbbk....","....kbbbbbbbk...","...kbbgggbbbBk..","kkkkkkkkkkkkkkk.","k yyYYyyyyyYYyk.","kkkkkkkkkkkkkkk.","...kbbbbbgBBBk..","....kbbbbBBBk...",".....kBBBBBk....","......kkkkk.....","................","................","................","................"],
 'star': ["................","........kk......","........kyk.....",".......kyyyk....",".......kyyyk....","kkkkkkkkyyyykkkk","kyyyyyyyyyyyyyYk",".kyyyyyyyyyyYYk.","..kyyyyyyyyYYk..","...kyyyyyyYYk...","...kyyyyyyYYk...","..kyyyYYkyYYYk..","..kyyYk..kYYYk..",".kyYk......kYk..",".kk..........kk.","................"],
 'rocket': ["................",".........kkk....","........kwwsk...",".......kwwwcsk..","......kwwwcbwsk.",".....kwwwwbbwsk.","....kkwwwwwwsk..","...krkwwwwwsSk..","..krrkkwwwSSk...","..krrkkkkkkk....","...kykyk.........","....kyk.........",".....k..........","................","................","................"],
 'comet': ["................","..............kk","............kkcwk","..........kkccwwk","........kkcccwwk.","..k...kkcccccck..","...kk.kcccccck...","..kbbkkbcccck....",".kbbbbkbbbbk.....",".kbbBBkkkkk......","..kBBk...........","...kk............","................","................","................","................"],
 'ufo': ["................","................","......kkkk......",".....kccccsk....","....kccwcccsk...","...kssssssssSk..","..kssbssbssbsSk.",".kssssssssssssSk","..kkSSSSSSSSkk..","...kk.k..k.kk...","...kk.k..k.kk...","................","................","................","................","................"],
 'clover': ["................","...kkk....kkk...","..kgggk..kgggk..","..kgllgkkgllgk..","..kgglggggglgk..","...kgggkkgggk...","....kkgGGgkk....","...kgggGGgggk...","..kgllgGGgllgk..","..kgglgGGglgk...","...kgggkkgggk...","....kkk.GG.kk...",".........GGk....","..........kk....","................","................"],
 'sprout': ["................","................","...kkk....kkk...","..kgggk..kgggk..",".kgglgGkkgGllgk.",".kgllgGkkgGgggk.","..kgggGk.kGggk..","...kkkk...kkk...","......kGGk......","......kGGk......",".....kttttk.....","....koooooook...","....koooooook...","....koOooooOk...",".....koooook....",".....kkkkkk....."],
 'crown': ["................","................","k....k....k....k","kk..kyk..kyk..kk","kyk.kyyk.kyyk.kyk","kyykkyyykkyyykkyk".replace('kyykkyyykkyyykkyk','kyykyyyyyyyyykyyk')[:16],"kyyyyyyyyyyyyyyk","kyyYyyyryyyYyyyk","kyyyyyyyyyyyyyyk","kYYYYYYYYYYYYYYk",".kkkkkkkkkkkkkk.","................","................","................","................","................"],
 'trophy': ["................","..kkkkkkkkkkkk..",".kyyywwyyyyyYk..","kkyyywyyyyyyYkk.","k.kyyyyyyyyyYk.k","k.kyyyyyyyyYYk.k",".kkkyyyyyyYYkkk.","...kkyyyyYYkk...",".....kyyYYk.....","......kyYk......","......kyYk......",".....kyyyYk.....","....kYYYYYYk....","....kkkkkkkk....","................","................"],
}

def render(rows):
    rows = [(r.replace(' ', '.') + '.' * 16)[:16] for r in rows]
    rows += ['.' * 16] * (16 - len(rows))
    out = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" shape-rendering="crispEdges">']
    for y, row in enumerate(rows[:16]):
        x = 0
        while x < 16:
            ch = row[x]
            if ch == '.':
                x += 1
                continue
            e = x
            while e < 16 and row[e] == ch:
                e += 1
            out.append(f'<rect x="{x}" y="{y}" width="{e - x}" height="1" fill="{PAL[ch]}"/>')
            x = e
    out.append('</svg>')
    return '\n'.join(out) + '\n'

dest = os.path.join(os.path.dirname(__file__), '..', 'public', 'server-tag-badges')
os.makedirs(dest, exist_ok=True)
for name, rows in SPRITES.items():
    with open(os.path.join(dest, f'{name}.svg'), 'w') as f:
        f.write(render(rows))
print(len(SPRITES), 'badges ->', os.path.abspath(dest))
