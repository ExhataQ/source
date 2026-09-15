import json, os, sys
from mutagen import File
from mutagen.id3 import ID3, COMM, TXXX, TIT2, TPE1, TALB, TPE2, TCOM, TCON, TDRC, TRCK, TPOS, TPUB, TCOP, TENC, TPE3, TPE4, TBPM, TSRC

def vals(v):
    if v is None: return []
    if isinstance(v, list): return [str(x) for x in v if x is not None]
    return [str(v)]
def first(tags,key):
    v=tags.get(key) if tags else None; a=vals(v); return a[0] if a else ''
def ev(tags,key): return ', '.join(vals(tags.get(key))) if tags else ''
def split_num(v):
    s=str(v or '')
    if '/' in s: return [x.strip() for x in s.split('/',1)]
    return [s.strip(),'']
def read_metadata(path):
    audio=File(path,easy=False)
    if audio is None: raise RuntimeError('Unsupported or unreadable audio file')
    tags=audio.tags or {}
    r={k:'' for k in ['title','artist','album','albumArtist','composer','genre','year','track','trackTotal','discNumber','discTotal','label','copyright','comment','conductor','remixer','sortTitle','sortArtist','sortAlbum','grouping','bpm','compilation','isrc','musicBrainzTrackId','musicBrainzAlbumId','musicBrainzArtistId','publisher','encodedBy']}
    if isinstance(audio,ID3):
        r.update(title=first(tags,'TIT2'),artist=', '.join(vals(tags.get('TPE1'))),album=first(tags,'TALB'),albumArtist=first(tags,'TPE2'),composer=', '.join(vals(tags.get('TCOM'))),genre=', '.join(vals(tags.get('TCON'))),year=first(tags,'TDRC'),label=first(tags,'TPUB'),copyright=first(tags,'TCOP'),conductor=first(tags,'TPE3'),remixer=first(tags,'TPE4'),bpm=first(tags,'TBPM'),isrc=first(tags,'TSRC'),sortTitle=first(tags,'TXXX:SORT_TITLE'),sortArtist=first(tags,'TXXX:SORT_ARTIST'),sortAlbum=first(tags,'TXXX:SORT_ALBUM'),grouping=first(tags,'TXXX:GROUPING'),compilation=first(tags,'TXXX:COMPILATION'),encodedBy=first(tags,'TENC'))
        r['track'],r['trackTotal']=split_num(first(tags,'TRCK')); r['discNumber'],r['discTotal']=split_num(first(tags,'TPOS'))
        cs=tags.getall('COMM'); r['comment']=str(cs[0].text[0]) if cs and cs[0].text else ''
    else:
        r.update(title=ev(tags,'title'),artist=ev(tags,'artist'),album=ev(tags,'album'),albumArtist=ev(tags,'albumartist') or ev(tags,'album artist'),composer=ev(tags,'composer'),genre=ev(tags,'genre'),year=ev(tags,'date') or ev(tags,'year'),label=ev(tags,'label'),copyright=ev(tags,'copyright'),comment=ev(tags,'comment'),conductor=ev(tags,'conductor'),remixer=ev(tags,'remixer'),sortTitle=ev(tags,'titlesort'),sortArtist=ev(tags,'artistsort'),sortAlbum=ev(tags,'albumsort'),grouping=ev(tags,'grouping'),bpm=ev(tags,'bpm'),compilation=ev(tags,'compilation'),isrc=ev(tags,'isrc'),musicBrainzTrackId=ev(tags,'musicbrainz_trackid'),musicBrainzAlbumId=ev(tags,'musicbrainz_albumid'),musicBrainzArtistId=ev(tags,'musicbrainz_artistid'),publisher=ev(tags,'publisher'),encodedBy=ev(tags,'encoded-by'))
        r['track'],r['trackTotal']=split_num(ev(tags,'tracknumber')); r['discNumber'],r['discTotal']=split_num(ev(tags,'discnumber'))
    return r
def clean(v): return str(v or '').strip()
def save_metadata(path,d):
    audio=File(path,easy=False)
    if audio is None: raise RuntimeError('Unsupported or unreadable audio file')
    if audio.tags is None: audio.add_tags()
    tags=audio.tags
    if isinstance(audio,ID3):
        def st(cls,key):
            tags.delall(cls.__name__[:4]); v=clean(d.get(key));
            if v: tags.add(cls(encoding=3,text=v))
        def sm(cls,key):
            tags.delall(cls.__name__[:4]); a=[x.strip() for x in clean(d.get(key)).split(',') if x.strip()];
            if a: tags.add(cls(encoding=3,text=a))
        def tx(desc,key):
            tags.delall('TXXX:'+desc); v=clean(d.get(key));
            if v: tags.add(TXXX(encoding=3,desc=desc,text=v))
        st(TIT2,'title'); sm(TPE1,'artist'); st(TALB,'album'); st(TPE2,'albumArtist'); sm(TCOM,'composer'); sm(TCON,'genre'); st(TDRC,'year'); st(TPUB,'label'); st(TCOP,'copyright'); st(TPE3,'conductor'); st(TPE4,'remixer'); st(TBPM,'bpm'); st(TSRC,'isrc'); st(TENC,'encodedBy')
        tags.delall('TRCK'); v=clean(d.get('track')); t=clean(d.get('trackTotal')); 
        if v: tags.add(TRCK(encoding=3,text=v+'/'+t if t else v))
        tags.delall('TPOS'); v=clean(d.get('discNumber')); t=clean(d.get('discTotal'))
        if v: tags.add(TPOS(encoding=3,text=v+'/'+t if t else v))
        tx('SORT_TITLE','sortTitle'); tx('SORT_ARTIST','sortArtist'); tx('SORT_ALBUM','sortAlbum'); tx('GROUPING','grouping'); tx('COMPILATION','compilation')
        tags.delall('COMM'); v=clean(d.get('comment'))
        if v: tags.add(COMM(encoding=3,lang='eng',desc='',text=v))
    else:
        mapping={'title':'title','artist':'artist','album':'album','albumArtist':'albumartist','composer':'composer','genre':'genre','year':'date','label':'label','copyright':'copyright','comment':'comment','conductor':'conductor','remixer':'remixer','sortTitle':'titlesort','sortArtist':'artistsort','sortAlbum':'albumsort','grouping':'grouping','bpm':'bpm','compilation':'compilation','isrc':'isrc','musicBrainzTrackId':'musicbrainz_trackid','musicBrainzAlbumId':'musicbrainz_albumid','musicBrainzArtistId':'musicbrainz_artistid','publisher':'publisher','encodedBy':'encoded-by'}
        for a,b in mapping.items():
            v=clean(d.get(a)); tags[b]=[v] if v else tags.pop(b,None)
        v=clean(d.get('track')); t=clean(d.get('trackTotal')); tags['tracknumber']=[v+'/'+t if t else v] if v else tags.pop('tracknumber',None)
        v=clean(d.get('discNumber')); t=clean(d.get('discTotal')); tags['discnumber']=[v+'/'+t if t else v] if v else tags.pop('discnumber',None)
    audio.save(); return read_metadata(path)
def main():
    q=json.loads(sys.stdin.read()); p=q.get('path')
    if not p or not os.path.isfile(p): raise RuntimeError('Audio file not found')
    r=save_metadata(p,q.get('metadata') or {}) if q.get('action')=='save' else read_metadata(p)
    print(json.dumps({'success':True,'metadata':r},ensure_ascii=False))
if __name__=='__main__':
    try: main()
    except Exception as e: print(json.dumps({'success':False,'error':str(e)})); sys.exit(1)
