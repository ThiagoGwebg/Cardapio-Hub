/**
 * Conteúdo da loja de demonstração (Brasa Burger — /loja/demo).
 *
 * Fica separado do seed porque é a parte que muda: quando quiser trocar um preço,
 * uma descrição ou um produto da vitrine, é aqui — o seed em si não precisa ser lido.
 *
 * `key` é o identificador estável do produto. É por ele que as fotos são ligadas
 * (scripts/demo-images.json) e que os pedidos de exemplo escolhem itens, então
 * renomear uma key quebra a foto e o histórico: prefira criar uma nova.
 */

/** Grupos de opção reaproveitados pelos hambúrgueres. */
function burgerGroups() {
  return [
    {
      name: 'Ponto da carne',
      required: true,
      min_select: 1,
      max_select: 1,
      options: [
        { name: 'Mal passado', price_delta_cents: 0 },
        { name: 'Ao ponto', price_delta_cents: 0 },
        { name: 'Bem passado', price_delta_cents: 0 },
      ],
    },
    {
      name: 'Adicionais',
      required: false,
      min_select: 0,
      max_select: 5,
      options: [
        { name: 'Bacon crocante', price_delta_cents: 500 },
        { name: 'Cheddar extra', price_delta_cents: 400 },
        { name: 'Ovo frito', price_delta_cents: 300 },
        { name: 'Cebola caramelizada', price_delta_cents: 300 },
        { name: 'Picles extra', price_delta_cents: 200 },
        { name: 'Hambúrguer extra (70g)', price_delta_cents: 900 },
      ],
    },
    {
      name: 'Retirar ingredientes',
      required: false,
      min_select: 0,
      max_select: 4,
      options: [
        { name: 'Sem cebola', price_delta_cents: 0 },
        { name: 'Sem picles', price_delta_cents: 0 },
        { name: 'Sem molho da casa', price_delta_cents: 0 },
        { name: 'Sem tomate', price_delta_cents: 0 },
      ],
    },
  ]
}

/** Molhos das porções. */
function sauceGroup() {
  return {
    name: 'Molhos',
    required: false,
    min_select: 0,
    max_select: 2,
    options: [
      { name: 'Barbecue', price_delta_cents: 300 },
      { name: 'Cheddar cremoso', price_delta_cents: 500 },
      { name: 'Maionese verde', price_delta_cents: 300 },
      { name: 'Molho da casa', price_delta_cents: 300 },
    ],
  }
}

export const CATEGORIES = [
  {
    name: 'Smash Burgers',
    emoji: '🍔',
    products: [
      {
        key: 'smash-classico',
        name: 'Smash Clássico',
        description:
          'Dois smashes de 70g, queijo cheddar, cebola caramelizada e molho da casa no pão brioche.',
        price_cents: 2490,
        groups: burgerGroups(),
      },
      {
        key: 'smash-duplo-cheddar',
        name: 'Smash Duplo Cheddar',
        description:
          'Três smashes de 70g com cheddar derretido em cada camada, picles e maionese defumada.',
        price_cents: 3290,
        groups: burgerGroups(),
      },
      {
        key: 'smash-bacon',
        name: 'Smash Bacon',
        description: 'Dois smashes, cheddar, bacon crocante em tiras e geleia de pimenta suave.',
        price_cents: 3190,
        groups: burgerGroups(),
      },
      {
        key: 'smash-veggie',
        name: 'Smash Veggie',
        description:
          'Dois discos de grão-de-bico e beterraba, queijo vegetal, rúcula e maionese de castanha.',
        price_cents: 2790,
        groups: burgerGroups(),
      },
    ],
  },
  {
    name: 'Burgers Artesanais',
    emoji: '🥓',
    products: [
      {
        key: 'brasa-burger',
        name: 'Brasa Burger',
        description:
          'Blend angus 180g grelhado na brasa, cheddar inglês, bacon, cebola roxa e molho barbecue defumado.',
        price_cents: 3890,
        groups: burgerGroups(),
      },
      {
        key: 'costela-defumada',
        name: 'Costela Defumada',
        description:
          'Costela desfiada por 12 horas na defumação, queijo prato, cebola crispy e maionese de alho tostado.',
        price_cents: 4190,
        groups: burgerGroups(),
      },
      {
        key: 'frango-crocante',
        name: 'Frango Crocante',
        description:
          'Filé de frango empanado na farinha panko, cheddar, alface americana e molho ranch.',
        price_cents: 2990,
        groups: burgerGroups(),
      },
      {
        key: 'cheese-salada',
        name: 'Cheese Salada',
        description:
          'Carne 150g, queijo prato, alface, tomate, cebola e maionese da casa. O clássico de sempre.',
        price_cents: 2690,
        groups: burgerGroups(),
      },
    ],
  },
  {
    name: 'Porções',
    emoji: '🍟',
    products: [
      {
        key: 'batata-rustica',
        name: 'Batata Rústica',
        description: 'Porção de 400g de batata rústica com alecrim e sal grosso.',
        price_cents: 1990,
        groups: [sauceGroup()],
      },
      {
        key: 'batata-cheddar-bacon',
        name: 'Batata com Cheddar e Bacon',
        description: 'Batata frita coberta com cheddar cremoso e cubos de bacon. Serve duas pessoas.',
        price_cents: 2890,
        groups: [sauceGroup()],
      },
      {
        key: 'onion-rings',
        name: 'Onion Rings',
        description: 'Doze anéis de cebola empanados na cerveja, crocantes por fora e macios por dentro.',
        price_cents: 2290,
        groups: [sauceGroup()],
      },
      {
        key: 'frango-empanado',
        name: 'Frango Empanado',
        description: 'Porção de 300g de iscas de frango empanadas, servidas com limão siciliano.',
        price_cents: 2490,
        groups: [sauceGroup()],
      },
    ],
  },
  {
    name: 'Bebidas',
    emoji: '🥤',
    products: [
      {
        key: 'coca-lata',
        name: 'Coca-Cola Lata 350ml',
        description: 'Gelada.',
        price_cents: 690,
        groups: [],
      },
      {
        key: 'refrigerante-lata',
        name: 'Refrigerante Lata 350ml',
        description: 'Gelado. Escolha o sabor.',
        price_cents: 650,
        groups: [
          {
            name: 'Sabor',
            required: true,
            min_select: 1,
            max_select: 1,
            options: [
              { name: 'Guaraná Antarctica', price_delta_cents: 0 },
              { name: 'Fanta Laranja', price_delta_cents: 0 },
              { name: 'Sprite', price_delta_cents: 0 },
              { name: 'Coca-Cola Zero', price_delta_cents: 0 },
            ],
          },
        ],
      },
      {
        key: 'suco-laranja',
        name: 'Suco de Laranja 400ml',
        description: 'Laranja pera espremida na hora, sem açúcar.',
        price_cents: 990,
        groups: [],
      },
      {
        key: 'cerveja-long-neck',
        name: 'Cerveja Long Neck 355ml',
        description: 'Puro malte, servida a 2 °C. Venda proibida para menores de 18 anos.',
        price_cents: 1290,
        groups: [],
      },
      {
        key: 'agua-mineral',
        name: 'Água Mineral 500ml',
        description: 'Com ou sem gás.',
        price_cents: 450,
        groups: [
          {
            name: 'Tipo',
            required: true,
            min_select: 1,
            max_select: 1,
            options: [
              { name: 'Sem gás', price_delta_cents: 0 },
              { name: 'Com gás', price_delta_cents: 100 },
            ],
          },
        ],
      },
    ],
  },
  {
    name: 'Sobremesas',
    emoji: '🍰',
    products: [
      {
        key: 'milkshake',
        name: 'Milkshake',
        description: 'Sorvete cremoso batido na hora. Escolha o tamanho e o sabor.',
        price_cents: 1690,
        groups: [
          {
            name: 'Tamanho',
            required: true,
            min_select: 1,
            max_select: 1,
            options: [
              { name: '300ml', price_delta_cents: 0 },
              { name: '500ml', price_delta_cents: 600 },
            ],
          },
          {
            name: 'Sabor',
            required: true,
            min_select: 1,
            max_select: 1,
            options: [
              { name: 'Ovomaltine', price_delta_cents: 300 },
              { name: 'Chocolate', price_delta_cents: 0 },
              { name: 'Morango', price_delta_cents: 0 },
              { name: 'Doce de leite', price_delta_cents: 200 },
            ],
          },
        ],
      },
      {
        key: 'brownie-sorvete',
        name: 'Brownie com Sorvete',
        description: 'Brownie de chocolate meio amargo quentinho com uma bola de sorvete de creme.',
        price_cents: 1790,
        groups: [],
      },
      {
        key: 'petit-gateau',
        name: 'Petit Gâteau',
        description: 'Bolinho com recheio cremoso de chocolate, servido com sorvete de baunilha.',
        price_cents: 1890,
        groups: [],
      },
    ],
  },
]

export const DELIVERY_ZONES = [
  { neighborhood: 'Centro', fee_cents: 600, min_order_cents: 2000 },
  { neighborhood: 'Jardim Paulista', fee_cents: 800, min_order_cents: 2000 },
  { neighborhood: 'Vila Nova', fee_cents: 950, min_order_cents: 3000 },
  { neighborhood: 'Parque das Flores', fee_cents: 1200, min_order_cents: 4000 },
]

export const COUPONS = [
  { code: 'BEMVINDO10', kind: 'percent', value: 10, min_order_cents: 3000 },
  { code: 'FRETEGRATIS', kind: 'free_shipping', value: 0, min_order_cents: 6000 },
  { code: 'COMBO5', kind: 'fixed', value: 500, min_order_cents: 4000 },
]

/**
 * Clientes RECORRENTES — os que voltam sempre e aparecem no topo do ranking da
 * aba Clientes, com o selo VIP.
 */
export const CUSTOMERS = [
  { name: 'Mariana Alves', phone: '19991234567', street: 'Rua das Acácias', number: '128', neighborhood: 'Centro' },
  { name: 'João Pedro Ramos', phone: '19998765432', street: 'Avenida Brasil', number: '742', neighborhood: 'Jardim Paulista' },
  { name: 'Carla Nunes', phone: '19993456789', street: 'Rua Sete de Setembro', number: '55', neighborhood: 'Centro' },
  { name: 'Rafael Lima', phone: '19992223344', street: 'Rua dos Ipês', number: '310', neighborhood: 'Vila Nova' },
  { name: 'Beatriz Souza', phone: '19994445566', street: 'Alameda das Palmeiras', number: '89', neighborhood: 'Parque das Flores' },
  { name: 'Diego Martins', phone: '19996667788', street: 'Rua Coronel Silva', number: '201', neighborhood: 'Jardim Paulista' },
  { name: 'Patrícia Gomes', phone: '19995551122', street: 'Rua do Comércio', number: '417', neighborhood: 'Centro' },
  { name: 'Lucas Ferreira', phone: '19997778899', street: 'Rua Santa Helena', number: '63', neighborhood: 'Vila Nova' },
]

/**
 * Clientes DE PASSAGEM — pedem uma ou duas vezes e somem. Existem para a aba
 * Clientes não mostrar uma base 100% recorrente, que nenhum lojista reconheceria
 * como a realidade dele e que faria a demo parecer maquiada.
 */
export const OCCASIONAL_CUSTOMERS = [
  { name: 'Fernanda Dias', phone: '19991110022', street: 'Rua Bahia', number: '45', neighborhood: 'Centro' },
  { name: 'Marcos Vinícius', phone: '19992220033', street: 'Rua Minas Gerais', number: '187', neighborhood: 'Jardim Paulista' },
  { name: 'Juliana Prado', phone: '19993330044', street: 'Avenida das Nações', number: '920', neighborhood: 'Vila Nova' },
  { name: 'Roberto Camargo', phone: '19994440055', street: 'Rua Paraná', number: '76', neighborhood: 'Centro' },
  { name: 'Aline Barbosa', phone: '19995550066', street: 'Rua Goiás', number: '512', neighborhood: 'Parque das Flores' },
  { name: 'Thiago Moreira', phone: '19996660077', street: 'Rua Ceará', number: '33', neighborhood: 'Jardim Paulista' },
  { name: 'Vanessa Rocha', phone: '19997770088', street: 'Alameda dos Jacarandás', number: '158', neighborhood: 'Vila Nova' },
  { name: 'Eduardo Pires', phone: '19998880099', street: 'Rua Amazonas', number: '404', neighborhood: 'Centro' },
  { name: 'Simone Castro', phone: '19991230011', street: 'Rua Pernambuco', number: '61', neighborhood: 'Parque das Flores' },
  { name: 'Gustavo Teixeira', phone: '19992340012', street: 'Rua Alagoas', number: '289', neighborhood: 'Jardim Paulista' },
  { name: 'Renata Lopes', phone: '19993450013', street: 'Rua Piauí', number: '17', neighborhood: 'Centro' },
  { name: 'Bruno Sales', phone: '19994560014', street: 'Rua Sergipe', number: '350', neighborhood: 'Vila Nova' },
  { name: 'Camila Andrade', phone: '19995670015', street: 'Avenida Tiradentes', number: '1120', neighborhood: 'Centro' },
  { name: 'Felipe Nogueira', phone: '19996780016', street: 'Rua Maranhão', number: '84', neighborhood: 'Jardim Paulista' },
  { name: 'Larissa Pinto', phone: '19997890017', street: 'Rua Rondônia', number: '222', neighborhood: 'Parque das Flores' },
  { name: 'André Monteiro', phone: '19998900018', street: 'Rua Tocantins', number: '9', neighborhood: 'Vila Nova' },
  { name: 'Priscila Ramos', phone: '19999010019', street: 'Rua Espírito Santo', number: '673', neighborhood: 'Centro' },
  { name: 'Vitor Hugo Braga', phone: '19991020020', street: 'Rua Acre', number: '41', neighborhood: 'Jardim Paulista' },
  { name: 'Tatiane Freitas', phone: '19992030021', street: 'Rua Roraima', number: '505', neighborhood: 'Vila Nova' },
  { name: 'Leandro Cardoso', phone: '19993040022', street: 'Rua Amapá', number: '138', neighborhood: 'Centro' },
  { name: 'Débora Antunes', phone: '19994050023', street: 'Alameda das Cerejeiras', number: '77', neighborhood: 'Parque das Flores' },
  { name: 'Sérgio Batista', phone: '19995060024', street: 'Rua Santa Catarina', number: '316', neighborhood: 'Jardim Paulista' },
  { name: 'Elaine Ribeiro', phone: '19996070025', street: 'Rua Rio Grande', number: '28', neighborhood: 'Centro' },
  { name: 'Otávio Mendes', phone: '19997080026', street: 'Rua Paraíba', number: '459', neighborhood: 'Vila Nova' },
]
