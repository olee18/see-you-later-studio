import { create } from 'zustand'
import type { FlowerType } from './data/flowers'

/** UI languages: Lao, Thai, English. */
export type Lang = 'lo' | 'th' | 'en'
export const LANGS: { id: Lang; label: string; name: string }[] = [
  { id: 'lo', label: 'ລາວ', name: 'ພາສາລາວ' },
  { id: 'th', label: 'ไทย', name: 'ภาษาไทย' },
  { id: 'en', label: 'EN', name: 'English' },
]

/** [English, Thai, Lao] */
type Tr = [string, string, string]
const IDX: Record<Lang, number> = { en: 0, th: 1, lo: 2 }

const STR = {
  // hero
  eyebrow: ['Bouquets for someone special', 'ช่อดอกไม้สำหรับคนพิเศษ', 'ຊໍ່ດອກໄມ້ສຳລັບຄົນພິເສດ'],
  lede: [
    'Arrange your own bouquet one flower at a time — every flower, every colour, your choice. Then wrap it, tie the bow, and surprise the one you love.',
    'จัดช่อดอกไม้ด้วยตัวเองทีละดอก — เลือกดอก เลือกสีได้ทุกดอก แล้วห่อกระดาษ ผูกโบว์ เซอร์ไพรส์คนที่คุณรัก',
    'ຈັດຊໍ່ດອກໄມ້ດ້ວຍຕົວເອງເທື່ອລະດອກ — ເລືອກດອກ ເລືອກສີໄດ້ທຸກດອກ ແລ້ວຫໍ່ເຈ້ຍ ຜູກໂບ ເຊີໄພຣສ໌ຄົນທີ່ເຈົ້າຮັກ',
  ],
  arrangeOwn: ['Arrange my own bouquet', 'จัดช่อดอกไม้เอง', 'ຈັດຊໍ່ດອກໄມ້ເອງ'],
  startReady: ['Start from a ready-made one', 'เริ่มจากช่อสำเร็จรูป', 'ເລີ່ມຈາກຊໍ່ສຳເລັດຮູບ'],
  continue: ['Continue “{name}” ({n} flowers) →', 'จัดต่อ “{name}” ({n} ดอก) →', 'ຈັດຕໍ່ “{name}” ({n} ດອກ) →'],
  language: ['Language', 'ภาษา', 'ພາສາ'],
  step1: ['Pick your flowers', 'เลือกดอกไม้', 'ເລືອກດອກໄມ້'],
  step2: ['Wrap & tie a bow', 'ห่อและผูกโบว์', 'ຫໍ່ ແລະ ຜູກໂບ'],
  step3: ['Snap a photo & send', 'ถ่ายรูปแล้วส่ง', 'ຖ່າຍຮູບແລ້ວສົ່ງ'],
  // toolbar
  studio: ['Studio', 'หน้าแรก', 'ໜ້າຫຼັກ'],
  backAria: ['Back to the studio', 'กลับหน้าแรก', 'ກັບໜ້າຫຼັກ'],
  tools: ['Bouquet tools', 'เครื่องมือ', 'ເຄື່ອງມື'],
  undo: ['Undo', 'ย้อนกลับ', 'ຍ້ອນກັບ'],
  redo: ['Redo', 'ทำซ้ำ', 'ເຮັດຄືນ'],
  emptyTitle: ['Your bouquet starts here', 'ช่อของคุณเริ่มตรงนี้', 'ຊໍ່ຂອງເຈົ້າເລີ່ມຢູ່ນີ້'],
  emptyBody: [
    'Tap a colour in the flower list to add your first flower — or drag it right onto the bouquet.',
    'แตะสีในรายการดอกไม้เพื่อเพิ่มดอกแรก — หรือลากไปวางบนช่อได้เลย',
    'ແຕະສີໃນລາຍການດອກໄມ້ເພື່ອເພີ່ມດອກທຳອິດ — ຫຼື ລາກໄປວາງໃສ່ຊໍ່ໄດ້ເລີຍ',
  ],
  // panel
  panelAria: ['Create your bouquet', 'สร้างช่อดอกไม้', 'ສ້າງຊໍ່ດອກໄມ້'],
  myBouquet: ['My Bouquet', 'ช่อของฉัน', 'ຊໍ່ຂອງຂ້ອຍ'],
  nFlowers: ['{n} flowers', '{n} ดอก', '{n} ດອກ'],
  ownStyle: ['Arranged by you', 'จัดเอง', 'ຈັດເອງ'],
  tabFlowers: ['Arrange flowers', 'จัดดอกไม้', 'ຈັດດອກໄມ້'],
  tabReady: ['Ready-made', 'ช่อสำเร็จรูป', 'ຊໍ່ສຳເລັດຮູບ'],
  tabPaper: ['Decorate', 'ตกแต่ง', 'ຕົກແຕ່ງ'],
  // templates
  tplIntro: [
    'Short on time? Pick a ready-made bouquet, then change any flower in',
    'ไม่มีเวลา? เลือกช่อสำเร็จรูป แล้วเปลี่ยนดอกไหนก็ได้ในแท็บ',
    'ບໍ່ມີເວລາ? ເລືອກຊໍ່ສຳເລັດຮູບ ແລ້ວປ່ຽນດອກໃດກໍໄດ້ໃນແຖບ',
  ],
  size: ['Size', 'ขนาด', 'ຂະໜາດ'],
  bouquets: ['Bouquets', 'แบบช่อ', 'ແບບຊໍ່'],
  startEmpty: ['Start empty', 'เริ่มจากช่อว่าง', 'ເລີ່ມຈາກຊໍ່ຫວ່າງ'],
  startEmptySub: ['Arrange from scratch', 'จัดเองตั้งแต่เริ่ม', 'ຈັດເອງຕັ້ງແຕ່ເລີ່ມ'],
  // paper
  wrapping: ['Wrapping paper', 'กระดาษห่อ', 'ເຈ້ຍຫໍ່'],
  ribbon: ['Ribbon bow', 'โบว์ริบบิ้น', 'ໂບຣິບບິ້ນ'],
  // library
  howTap: ['Tap a colour', 'แตะสี', 'ແຕະສີ'],
  howTapRest: ['to add that flower', 'เพื่อเพิ่มดอกนั้น', 'ເພື່ອເພີ່ມດອກນັ້ນ'],
  howDrag: ['Drag it', 'ลาก', 'ລາກ'],
  howDragRest: ['onto the bouquet to place it', 'ไปวางบนช่อตรงจุดที่ต้องการ', 'ໄປວາງໃສ່ຊໍ່ຕາມຈຸດທີ່ຕ້ອງການ'],
  secFlowers: ['Flowers', 'ดอกไม้', 'ດອກໄມ້'],
  secFillers: ['Fillers & greens', 'ดอกแซมและใบไม้', 'ດອກແຊມ ແລະ ໃບໄມ້'],
  addAria: ['Add {color} {flower}', 'เพิ่ม{flower}สี{color}', 'ເພີ່ມ{flower}ສີ{color}'],
  dotTitle: [
    '{color} {flower} — tap to add, or drag onto the bouquet',
    '{flower}สี{color} — แตะเพื่อเพิ่ม หรือลากไปวางบนช่อ',
    '{flower}ສີ{color} — ແຕະເພື່ອເພີ່ມ ຫຼື ລາກໄປວາງໃສ່ຊໍ່',
  ],
  ghostOff: ['Drop on the bouquet', 'วางบนช่อดอกไม้', 'ວາງໃສ່ຊໍ່ດອກໄມ້'],
  ghostSlot: ['Release to place here', 'ปล่อยเพื่อวางตรงนี้', 'ປ່ອຍເພື່ອວາງບ່ອນນີ້'],
  ghostAdd: ['Release to add', 'ปล่อยเพื่อเพิ่ม', 'ປ່ອຍເພື່ອເພີ່ມ'],
  // selected flower
  selHint: ['Change colour, remove, or drag it to move', 'เปลี่ยนสี เอาออก หรือลากเพื่อย้าย', 'ປ່ຽນສີ ເອົາອອກ ຫຼື ລາກເພື່ອຍ້າຍ'],
  deselect: ['Deselect', 'ยกเลิกการเลือก', 'ຍົກເລີກການເລືອກ'],
  makeIt: ['Make it {color}', 'เปลี่ยนเป็นสี{color}', 'ປ່ຽນເປັນສີ{color}'],
  removeFlower: ['Remove flower', 'เอาดอกนี้ออก', 'ເອົາດອກນີ້ອອກ'],
  // bouquet switcher
  rename: ['rename', 'เปลี่ยนชื่อ', 'ປ່ຽນຊື່'],
  newBouquet: ['+ New', '+ ช่อใหม่', '+ ຊໍ່ໃໝ່'],
  duplicate: ['Duplicate', 'ทำสำเนา', 'ສຳເນົາ'],
  copy: ['copy', 'สำเนา', 'ສຳເນົາ'],
  del: ['Delete', 'ลบ', 'ລຶບ'],
  delConfirm: ['Tap again to delete', 'แตะอีกครั้งเพื่อลบ', 'ແຕະອີກເທື່ອເພື່ອລຶບ'],
  myBouquets: ['My bouquets', 'ช่อของฉัน', 'ຊໍ່ຂອງຂ້ອຍ'],
  // toasts
  tooManyBouquets: [
    'You can keep up to {n} bouquets — delete one first.',
    'เก็บได้สูงสุด {n} ช่อ — ลบช่อเก่าออกก่อนนะ',
    'ເກັບໄດ້ສູງສຸດ {n} ຊໍ່ — ລຶບຊໍ່ເກົ່າອອກກ່ອນເດີ້',
  ],
  bouquetFull: ['The bouquet is full — {n} flowers max.', 'ช่อเต็มแล้ว — สูงสุด {n} ดอก', 'ຊໍ່ເຕັມແລ້ວ — ສູງສຸດ {n} ດອກ'],
  // bouquet shapes
  shape: ['Bouquet shape', 'รูปทรงช่อ', 'ຮູບຊົງຊໍ່'],
  shape_korean: ['Korean wrap', 'ห่อสไตล์เกาหลี', 'ຫໍ່ແບບເກົາຫຼີ'],
  shape_cone: ['Tall cone', 'ทรงกรวยสูง', 'ຊົງກວຍສູງ'],
  shape_handtied: ['Hand-tied', 'ช่อมัดมือ', 'ຊໍ່ມັດມື'],
  shape_posy: ['Round posy', 'ช่อกลม', 'ຊໍ່ມົນ'],
  // stands
  stand: ['Bouquet stand', 'ขาตั้งช่อ', 'ຂາຕັ້ງຊໍ່'],
  stand_gold: ['Gold stand', 'ขาตั้งสีทอง', 'ຂາຕັ້ງສີຄຳ'],
  stand_ceramic: ['Ceramic cup', 'ถ้วยเซรามิก', 'ຖ້ວຍເຊລາມິກ'],
  stand_glass: ['Glass vase', 'แจกันแก้ว', 'ແຈກັນແກ້ວ'],
  stand_basket: ['Rattan basket', 'ตะกร้าหวาย', 'ກະຕ່າຫວາຍ'],
  stand_box: ['Wooden box', 'กล่องไม้', 'ກ່ອງໄມ້'],
  // photo mode
  photo: ['Photo', 'ถ่ายรูป', 'ຖ່າຍຮູບ'],
  msgCard: ['Message card', 'การ์ดข้อความ', 'ບັດຂໍ້ຄວາມ'],
  cardStyle: ['Card style', 'แบบการ์ด', 'ແບບບັດ'],
  design_card: ['Gift card', 'การ์ดของขวัญ', 'ບັດຂອງຂວັນ'],
  design_polaroid: ['Polaroid', 'โพลารอยด์', 'ໂພລາລອຍ'],
  design_band: ['Elegant band', 'แถบหรู', 'ແຖບຫຼູຫຼາ'],
  toLabel: ['To', 'ถึง', 'ເຖິງ'],
  fromLabel: ['From', 'จาก', 'ຈາກ'],
  toPh: ['Their name', 'ชื่อคนรับ', 'ຊື່ຜູ້ຮັບ'],
  fromPh: ['Your name', 'ชื่อของคุณ', 'ຊື່ຂອງເຈົ້າ'],
  messagePh: ['Write something sweet…', 'เขียนอะไรหวาน ๆ ถึงเขา…', 'ຂຽນຫຍັງຫວານໆ ຫາລາວ…'],
  tabCamera: ['Camera', 'กล้อง', 'ກ້ອງ'],
  tabMessage: ['Message', 'ข้อความ', 'ຂໍ້ຄວາມ'],
  clearMsg: ['Clear', 'ล้าง', 'ລ້າງ'],
  photoMode: ['Photo mode', 'โหมดถ่ายรูป', 'ໂໝດຖ່າຍຮູບ'],
  backToArrange: ['Back to arranging', 'กลับไปจัดช่อ', 'ກັບໄປຈັດຊໍ່'],
  angle: ['Angle', 'มุมกล้อง', 'ມຸມກ້ອງ'],
  angle_three: ['Angled', 'มุมเฉียง', 'ມຸມອຽງ'],
  angle_front: ['Front', 'ด้านหน้า', 'ດ້ານໜ້າ'],
  angle_top: ['From above', 'มุมสูง', 'ມຸມສູງ'],
  angle_close: ['Close-up', 'ระยะใกล้', 'ໄລຍະໃກ້'],
  room: ['Room', 'ห้อง', 'ຫ້ອງ'],
  room_atelier: ['Morning Atelier', 'สตูดิโอยามเช้า', 'ສະຕູດິໂອຍາມເຊົ້າ'],
  room_blush: ['Pink Café', 'คาเฟ่สีชมพู', 'ຄາເຟສີບົວ'],
  room_evening: ['Candlelight', 'แสงเทียน', 'ແສງທຽນ'],
  caption: ['Message on the photo', 'ข้อความบนรูป', 'ຂໍ້ຄວາມເທິງຮູບ'],
  captionPh: ['Write a message (optional) — e.g. For you ♡', 'เขียนข้อความ (ไม่ใส่ก็ได้) เช่น ให้เธอนะ ♡', 'ຂຽນຂໍ້ຄວາມ (ບໍ່ໃສ່ກໍໄດ້) ເຊັ່ນ ໃຫ້ເຈົ້ານະ ♡'],
  shutter: ['Take photo', 'กดถ่ายรูป', 'ກົດຖ່າຍຮູບ'],
  dragHint: ['Drag to turn the camera', 'ลากเพื่อหมุนมุมกล้อง', 'ລາກເພື່ອໝຸນມຸມກ້ອງ'],
  yourPhoto: ['Your photo', 'รูปของคุณ', 'ຮູບຂອງເຈົ້າ'],
  savePhoto: ['Save photo', 'บันทึกรูป', 'ບັນທຶກຮູບ'],
  sharePhoto: ['Share', 'แชร์', 'ແບ່ງປັນ'],
  retake: ['Take another', 'ถ่ายใหม่', 'ຖ່າຍໃໝ່'],
  close: ['Close', 'ปิด', 'ປິດ'],
  longPress: [
    'On a phone you can also press and hold the photo to save it.',
    'บนมือถือ กดค้างที่รูปเพื่อบันทึกได้เลย',
    'ໃນມືຖື ກົດຄ້າງທີ່ຮູບເພື່ອບັນທຶກໄດ້ເລີຍ',
  ],
  saved: ['Photo saved ♡', 'บันทึกรูปแล้ว ♡', 'ບັນທຶກຮູບແລ້ວ ♡'],
  saveFailed: ['Could not save — press and hold the photo instead.', 'บันทึกไม่ได้ — ลองกดค้างที่รูปแทน', 'ບັນທຶກບໍ່ໄດ້ — ລອງກົດຄ້າງທີ່ຮູບແທນ'],
} satisfies Record<string, Tr>

export type StrKey = keyof typeof STR

const FLOWER_NAMES: Record<FlowerType, Tr> = {
  rose: ['Rose', 'กุหลาบ', 'ກຸຫຼາບ'],
  tulip: ['Tulip', 'ทิวลิป', 'ທິວລິບ'],
  peony: ['Peony', 'โบตั๋น', 'ໂບຕັ໋ນ'],
  sunflower: ['Sunflower', 'ทานตะวัน', 'ທານຕະເວັນ'],
  hydrangea: ['Hydrangea', 'ไฮเดรนเยีย', 'ໄຮເດຣນເຢຍ'],
  lily: ['Lily', 'ลิลลี่', 'ລີລີ່'],
  carnation: ['Carnation', 'คาร์เนชั่น', 'ຄາເນຊັ່ນ'],
  orchid: ['Orchid', 'กล้วยไม้', 'ດອກເອື້ອງ'],
  gerbera: ['Gerbera', 'เยอบีร่า', 'ເຢີບີຣາ'],
  babysBreath: ["Baby's Breath", 'ยิปโซ', 'ຢິບໂຊ'],
  eucalyptus: ['Eucalyptus', 'ยูคาลิปตัส', 'ຢູຄາລິບຕັສ'],
  fern: ['Fern', 'เฟิร์น', 'ເຟີນ'],
  ruscus: ['Ruscus', 'รัสคัส', 'ຣັສຄັສ'],
  daisy: ['Daisy', 'เดซี่', 'ເດຊີ່'],
  chrysanthemum: ['Chrysanthemum', 'เบญจมาศ', 'ເບັນຈະມາດ'],
  ranunculus: ['Ranunculus', 'รานันคูลัส', 'ຣານັນຄູລັສ'],
  lisianthus: ['Lisianthus', 'ลิเซียนทัส', 'ລີຊຽນທັສ'],
  calla: ['Calla Lily', 'คาล่าลิลลี่', 'ຄາລ່າລີລີ່'],
  marigold: ['Marigold', 'ดาวเรือง', 'ດາວເຮືອງ'],
  lavender: ['Lavender', 'ลาเวนเดอร์', 'ລາເວນເດີ'],
  jasmine: ['Jasmine', 'มะลิ', 'ມະລິ'],
}

/** colour names used by flowers, wraps and ribbons (keyed by the English name) */
const COLOR_NAMES: Record<string, Tr> = {
  Red: ['Red', 'แดง', 'ແດງ'],
  Pink: ['Pink', 'ชมพู', 'ບົວ'],
  'Light pink': ['Light pink', 'ชมพูอ่อน', 'ບົວອ່ອນ'],
  Blush: ['Blush', 'ชมพูนู้ด', 'ບົວນູດ'],
  White: ['White', 'ขาว', 'ຂາວ'],
  Cream: ['Cream', 'ครีม', 'ຄຣີມ'],
  Peach: ['Peach', 'พีช', 'ພີຊ'],
  Coral: ['Coral', 'ปะการัง', 'ປະກາລັງ'],
  Yellow: ['Yellow', 'เหลือง', 'ເຫຼືອງ'],
  Orange: ['Orange', 'ส้ม', 'ສົ້ມ'],
  Lilac: ['Lilac', 'ม่วงอ่อน', 'ມ່ວງອ່ອນ'],
  Purple: ['Purple', 'ม่วง', 'ມ່ວງ'],
  'Purple tip': ['Purple tip', 'ขอบม่วง', 'ຂອບມ່ວງ'],
  Blue: ['Blue', 'ฟ้า', 'ຟ້າ'],
  Green: ['Green', 'เขียว', 'ຂຽວ'],
  'Silver green': ['Silver green', 'เขียวเงิน', 'ຂຽວເງິນ'],
  Classic: ['Classic', 'คลาสสิก', 'ຄລາສສິກ'],
  // ribbons
  Champagne: ['Champagne', 'แชมเปญ', 'ແຊມເປນ'],
  Sky: ['Sky', 'ฟ้า', 'ຟ້າ'],
  Navy: ['Navy', 'กรมท่า', 'ຟ້າເຂັ້ມ'],
  Sage: ['Sage', 'เขียวเสจ', 'ຂຽວອ່ອນ'],
  Black: ['Black', 'ดำ', 'ດຳ'],
  // wraps
  'Pink & White': ['Pink & White', 'ชมพู-ขาว', 'ບົວ-ຂາວ'],
  'Pearl White': ['Pearl White', 'ขาวมุก', 'ຂາວມຸກ'],
  'Sky Blue': ['Sky Blue', 'ฟ้าอ่อน', 'ຟ້າອ່ອນ'],
  'Navy & White': ['Navy & White', 'กรมท่า-ขาว', 'ຟ້າເຂັ້ມ-ຂາວ'],
  Kraft: ['Kraft', 'คราฟท์', 'ຄຣາຟ'],
  Tangerine: ['Tangerine', 'ส้มสด', 'ສົ້ມສົດ'],
}

const STYLE_NAMES: Record<string, Tr> = {
  'sweet-pink': ['Sweet Pink Roses', 'กุหลาบชมพูหวาน', 'ກຸຫຼາບບົວຫວານ'],
  'red-heart': ['Red Rose Heart', 'หัวใจกุหลาบแดง', 'ຫົວໃຈກຸຫຼາບແດງ'],
  'classic-red': ['Classic Red', 'กุหลาบแดงคลาสสิก', 'ກຸຫຼາບແດງຄລາສສິກ'],
  'peony-luxe': ['Peony Luxury', 'โบตั๋นหรู', 'ໂບຕັ໋ນຫຼູຫຼາ'],
}

const KEY = 'bloom-studio:lang'

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'lo' || saved === 'th' || saved === 'en') return saved
  } catch { /* storage blocked */ }
  const langs = typeof navigator !== 'undefined' ? navigator.languages ?? [navigator.language] : []
  for (const l of langs) {
    const p = l.toLowerCase().slice(0, 2)
    if (p === 'lo' || p === 'th' || p === 'en') return p
  }
  return 'en'
}

interface LangState {
  lang: Lang
  setLang: (l: Lang) => void
}

export const useLang = create<LangState>()((set) => ({
  lang: initialLang(),
  setLang: (lang) => {
    try { localStorage.setItem(KEY, lang) } catch { /* ignore */ }
    set({ lang })
  },
}))

const syncHtmlLang = (l: Lang) => { if (typeof document !== 'undefined') document.documentElement.lang = l }
syncHtmlLang(useLang.getState().lang)
useLang.subscribe((s) => syncHtmlLang(s.lang))

const fill = (s: string, vars?: Record<string, string | number>) =>
  vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : s

const pick = (tr: Tr | undefined, lang: Lang, fallback: string) => (tr ? tr[IDX[lang]] || tr[0] : fallback)

/** translate outside React (toasts, store) — uses the current language */
export function t(key: StrKey, vars?: Record<string, string | number>, lang: Lang = useLang.getState().lang) {
  return fill(pick(STR[key], lang, key), vars)
}
export const flowerName = (type: FlowerType, lang: Lang) => pick(FLOWER_NAMES[type], lang, type)
export const colorName = (name: string, lang: Lang) => pick(COLOR_NAMES[name], lang, name)
export const styleName = (id: string, lang: Lang) => pick(STYLE_NAMES[id], lang, id)

/** Translator bound to the current language; re-renders when it changes. */
export function useT() {
  const lang = useLang((s) => s.lang)
  return {
    lang,
    t: (key: StrKey, vars?: Record<string, string | number>) => t(key, vars, lang),
    flower: (type: FlowerType) => flowerName(type, lang),
    color: (name: string) => colorName(name, lang),
    style: (id: string) => styleName(id, lang),
  }
}

/**
 * Display name for a saved bouquet. Auto names (taken from the template, e.g.
 * "Pink Cloud 2") are shown in the current language; names typed by the user
 * are shown as typed.
 */
export function bouquetLabel(b: { name: string; autoName?: boolean; design: { style: string | null } }, lang: Lang) {
  if (!b.autoName) return b.name
  const suffix = b.name.match(/ (\d+)$/)?.[1]
  const base = b.design.style && STYLE_NAMES[b.design.style] ? styleName(b.design.style, lang) : t('myBouquet', undefined, lang)
  return suffix ? `${base} ${suffix}` : base
}
