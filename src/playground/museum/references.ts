// References the museum cites (colophon), each with its source (D15, task 6.8). The years and
// numbers the colophon shows come from here and are written nowhere else.

export interface Reference {
  id: string;
  /** Citation in HTML: author, title in `<cite>`, publisher or place, and year. */
  html: string;
  /** What the museum uses it for. */
  use: string;
  url: string;
}

export const REFERENCES: readonly Reference[] = [
  {
    id: 'monge',
    html: 'Gaspard Monge, <cite>Géométrie descriptive. Leçons données aux Écoles normales, l’an 3 de la République</cite>, Paris, Baudouin, an VII (1798–99); the lectures were given in 1795',
    use: 'the épure: plan and elevation on one sheet, the vertical plane turned about its intersection with the horizontal one “as on a hinge”, which is the fold of every sheet here',
    url: 'https://gallica.bnf.fr/ark:/12148/bpt6k5783452x',
  },
  {
    id: 'church',
    html: 'Albert E. Church, <cite>Elements of Descriptive Geometry</cite>, New York, A. S. Barnes, 1864 (1867 printing)',
    use: 'the English name of the line where the two planes meet, the ground line',
    url: 'https://archive.org/details/elementsofdescri00churrich',
  },
  {
    id: 'booklet-9',
    html: 'Daniel Giralt-Miracle, <cite>Interior of the Basilica</cite>, Information Booklet 9, Fundació Junta Constructora del Temple Expiatori de la Sagrada Família, 2022',
    use: 'the double-twist column of the method sheet, and the light: the stained-glass windows, by Joan Vila-Grau, are bluer on the morning side and more orange on the evening side, which inspired this page’s wash',
    url: 'https://sagradafamilia.org/documents/20142/1000561/Booklet_09.pdf/283a74b1-9c07-cedb-6211-cf3cb4db7aad',
  },
  {
    id: 'double-twist',
    html: 'Jaume Serrallonga, <cite>Double twist columns: geometry, mechanics and symbolism</cite>, Blog Sagrada Família, 2018 (archived copy)',
    use: 'how each section of a column doubles its points, with half the height and half the turn',
    url: 'http://web.archive.org/web/20240923235551/https://blog.sagradafamilia.org/en/specialists/double-twist-columns/',
  },
  {
    id: 'bragdon',
    html: 'Claude Bragdon, <cite>Projective Ornament</cite>, Rochester, NY, The Manas Press, 1915',
    use: 'the tesseract of the method sheet, projected from four dimensions to three and drawn in plan and elevation',
    url: 'https://archive.org/details/projective-ornament',
  },
  {
    id: 'eames',
    html: 'Charles and Ray Eames, <cite>Mathematica: A World of Numbers… and Beyond</cite>, an exhibition commissioned by IBM, California Museum of Science and Industry, Los Angeles, 1961, and its History Wall',
    use: 'the index of sheets, with a rule each time the date changes',
    url: 'https://en.wikipedia.org/wiki/Mathematica:_A_World_of_Numbers..._and_Beyond',
  },
  {
    id: 'van-doesburg',
    html: 'Theo van Doesburg, <cite>Towards a plastic architecture</cite>, 1924, point 11, in Ulrich Conrads (ed.), <cite>Programs and Manifestoes on 20th-Century Architecture</cite>, MIT Press, 1970',
    use: 'time as a dimension, “height, breadth, and depth plus time”: the common axes of the épure on every work sheet',
    url: 'https://www2.gwu.edu/~art/Temporary_SL/177/pdfs/Doesburg.pdf',
  },
];

/** Words that are not English and their translation (spec playground-hub, "English copy"). */
export const GLOSSARY: readonly { term: string; lang: string; meaning: string }[] = [
  {
    term: 'épure',
    lang: 'fr',
    meaning: 'a descriptive-geometry drawing: an object shown in plan and in elevation on one sheet, the two views joined by the ground line, as if the vertical plane had been folded flat onto the horizontal one',
  },
];
