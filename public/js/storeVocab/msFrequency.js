// Common Malay words, ranked by frequency (most common first).
// Position in the array = rank, used by rarity.js to score how common
// a captured word is. Not an exhaustive dataset - extend further if
// real usage shows too many common words landing as "rare".
const MS_COMMON_WORDS = [
  "saya", "kamu", "dia", "kami", "kita", "mereka", "anda", "ini", "itu",
  "yang", "dan", "di", "ke", "dari", "untuk", "dengan", "tidak", "bukan",
  "ada", "akan", "sudah", "belum", "boleh", "mahu", "nak", "suka", "sayang",
  "makan", "minum", "tidur", "bangun", "pergi", "datang", "balik", "jalan",
  "rumah", "sekolah", "kerja", "pejabat", "kedai", "pasar", "hospital",
  "baik", "buruk", "besar", "kecil", "banyak", "sedikit", "cantik", "hodoh",
  "hari", "minggu", "bulan", "tahun", "pagi", "tengahari", "petang", "malam",
  "ibu", "bapa", "adik", "abang", "kakak", "nenek", "datuk", "kawan",
  "nasi", "ayam", "ikan", "sayur", "air", "teh", "kopi", "gula",
  "terima", "kasih", "tolong", "maaf", "selamat", "jumpa", "bercakap",
];