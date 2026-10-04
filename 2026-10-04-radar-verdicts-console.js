// Radar verdict хадгалах — starshopping.mn/board/ табд Console-д paste. Түлхүүр зөвхөн таны хөтөчөөс уншигдаж n8n 10b руу явна.
(async()=>{
 const k=localStorage.getItem('ss_board_key')||'';
 if(!k){console.log('ss_board_key алга — самбарт нэвтэрсэн табд ажиллуул');return;}
 const radar=[
 {
  "cand_id": 95,
  "status": "promote",
  "product": "Үс буржгарлуулагч · 32мм долгионтой халуун багаж",
  "mn_terms": "үс буржигнуулагч,үсний буржгар машин,үс долгиолуулагч,hair curler",
  "angle": "үсний гэмтэл, 10 сек халдаг, сөрөг ион"
 },
 {
  "cand_id": 103,
  "status": "promote",
  "product": "Гал тогооны крантын 360° эргэдэг шүрших толгой (aerator)",
  "mn_terms": "крантын толгой,усны шүрших толгой,360 эргэдэг кран,кранны насадка",
  "angle": "гал тогоо, усны хэмнэлт, 360° эргэнэ"
 },
 {
  "cand_id": 106,
  "status": "promote",
  "product": "Автомат өнхрөх тоглоом (муур, нохойд)",
  "mn_terms": "муурын тоглоом,автомат бөмбөг,нохойн тоглоом,интерактив тоглоом муур",
  "angle": "амьтныг хэдэн цаг зугаацуулна"
 },
 {
  "cand_id": 105,
  "status": "promote",
  "product": "2-in-1 цахилгаан нүүр цэвэрлэгч (aqua peel)",
  "mn_terms": "нүүр цэвэрлэгч,хар толбо цэвэрлэгч,aqua peel,нүүр цэвэрлэх аппарат",
  "angle": "хар толбо, тослог арьс"
 },
 {
  "cand_id": 119,
  "status": "promote",
  "product": "Шүршүүрийн хөл гүйлгэгч массаж дэвсгэр (силикон)",
  "mn_terms": "хөл угаагч дэвсгэр,хөлийн массаж дэвсгэр,угаалгын өрөөний дэвсгэр,хөл самнуур",
  "angle": "шүршүүр орох бүрт хөлийн массаж"
 },
 {
  "cand_id": 113,
  "status": "promote",
  "product": "Тохируулдаг гар чангалагч (grip trainer)",
  "mn_terms": "гарын хүч,grip,гар чангалагч,хуруу дасгал",
  "angle": "өдөрт 5 минут, шатлалтай ачаалал"
 },
 {
  "cand_id": 101,
  "status": "promote",
  "product": "Орны хажуугийн хадгалах халаас (утас, пульт, ном)",
  "mn_terms": "орны халаас,орны хажуугийн тавиур,утасны халаас,орны органайзер",
  "angle": "орны завсар алдагддаг зүйл"
 },
 {
  "cand_id": 115,
  "status": "promote",
  "product": "Машины суудлын завсар органайзер / хундага тавиур өргөтгөгч",
  "mn_terms": "машины органайзер,суудлын завсар,хундага тавиур,машины хадгалах",
  "angle": "Auto Tools page"
 },
 {
  "cand_id": 102,
  "status": "dupe",
  "dupe_of": 101
 },
 {
  "cand_id": 120,
  "status": "dupe",
  "dupe_of": 106
 },
 {
  "cand_id": 108,
  "status": "dupe",
  "dupe_of": 119
 },
 {
  "cand_id": 121,
  "status": "dupe",
  "dupe_of": 113
 },
 {
  "cand_id": 110,
  "status": "dupe",
  "dupe_of": 96
 },
 {
  "cand_id": 133,
  "status": "dupe",
  "dupe_of": 96
 },
 {
  "cand_id": 135,
  "status": "dupe",
  "dupe_of": 96
 },
 {
  "cand_id": 96,
  "status": "watch"
 },
 {
  "cand_id": 116,
  "status": "watch"
 },
 {
  "cand_id": 127,
  "status": "watch"
 },
 {
  "cand_id": 131,
  "status": "watch"
 },
 {
  "cand_id": 97,
  "status": "reject"
 },
 {
  "cand_id": 99,
  "status": "reject"
 },
 {
  "cand_id": 123,
  "status": "reject"
 },
 {
  "cand_id": 98,
  "status": "generic"
 },
 {
  "cand_id": 100,
  "status": "generic"
 },
 {
  "cand_id": 104,
  "status": "generic"
 },
 {
  "cand_id": 107,
  "status": "generic"
 },
 {
  "cand_id": 109,
  "status": "generic"
 },
 {
  "cand_id": 111,
  "status": "generic"
 },
 {
  "cand_id": 112,
  "status": "generic"
 },
 {
  "cand_id": 114,
  "status": "generic"
 },
 {
  "cand_id": 117,
  "status": "generic"
 },
 {
  "cand_id": 125,
  "status": "generic"
 },
 {
  "cand_id": 128,
  "status": "generic"
 },
 {
  "cand_id": 129,
  "status": "generic"
 },
 {
  "cand_id": 130,
  "status": "generic"
 },
 {
  "cand_id": 132,
  "status": "generic"
 },
 {
  "cand_id": 118,
  "status": "brand"
 },
 {
  "cand_id": 122,
  "status": "brand"
 },
 {
  "cand_id": 124,
  "status": "brand"
 },
 {
  "cand_id": 126,
  "status": "brand"
 }
];
 const r=await fetch('https://starshopping.app.n8n.cloud/webhook/board-data?k='+encodeURIComponent(k),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({radar})});
 console.log(r.status, await r.text());
})();
