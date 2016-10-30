# To Do

Vou utilizar como padrão de código o [Standard](http://standardjs.com/), logo teremos que refatorar:

- não utilização do `;`
- definição de variáveis sendo 1 por linha

Por exemplo como está:

```js
'use strict';

let mongoose            = require('../../config/MongooseConfig.js'),
    schema              = require('./schema');

let CustomerRepository  = mongoose.model('Customer', schema);

module.exports = CustomerRepository;
```

Como deve ficar:

```js
const mongoose = require('../../config/MongooseConfig.js')
const schema = require('./schema')
const name = 'Customer'

const Repository  = mongoose.model(name, schema)

module.exports = Repository
```

*ps: com as versões mais novas do Node os módulos já trabalham em strict!*

> Percebeu que eu coloquei o `'Customer'` na `const name`?

Fiz isso para ficar mais fácil e rápido de criar outros arquivos como esse, assim:

```js
const mongoose = require('../../config/MongooseConfig.js')
const schema = require('./schema')
const name = 'Order'

const Repository  = mongoose.model(name, schema)

module.exports = Repository
```

```js
const mongoose = require('../../config/MongooseConfig.js')
const schema = require('./schema')
const name = 'Product'

const Repository  = mongoose.model(name, schema)

module.exports = Repository
```

Porém ainda podemos deixar mais genérico ainda, basta criarmos o arquivo `config.js` dentro da pasta do módulo e nele teremos, basicamente:

```js
const mongoose = require('../../config/MongooseConfig.js')
const schema = require('./schema')
const controller = require('./controller')
const routes = require('./routes')
const repository = require('./repository')
const name = __dirname.split('/').reverse()[0] // 'Order'

module.exports = {
  mongoose,
  schema,
  name,
  controller,
  repository,
  routes
}
```

Nesse caso ele sempre irá pegar o nome da pasta do módulo, que é o nome do módulo **como também o nome do *Model***, pois com isso centralizamos todos os arquivos necessários para o módulo e se precisarmos alterar algo iremos apenas alterar o `config.js`.

Agora olhe como ficou o `repository.js`:

```js
const config = require('./config')
const mongoose = require('mongoose')
const schema = config.schema
const name = config.name

const Repository  = mongoose.model(name, schema)

module.exports = Repository
```

> Dessa forma basicamente **todos os `repository.js` terão esse mesmo código!**

## Arquitetura

### Pastas

Isolar os arquivos de *backend* na pasta `server` e os de *frontend* na pasta `client`, com isso tb migrar os testes cada um para sua pasta.

#### modules

Encapsular todos os arquivos de cada módulo na sua pasta `modules/NomeModulo`.

Dentro dele teremos os arquivos:

- config.js
- schema.js
- controller.js
- repository.js
- routes.js

### Rotas

Não colocar todas as rotas no mesmo arquivo, se for colocar que seja chamando o arquivo de rota de cada módulo, por exemplo vejamos como está:

```js
'use strict';

let router = require('express').Router();

router.get('/', function(request, response, next) {
  response.send('PONG');
})
router.use('/customers', require('./customers'));
router.use('/orders', require('./orders'));
router.use('/postalcodes', require('./postalcodes'));
router.use('/products', require('./products'));
router.use('/referencePoints', require('./referencePoints'));

module.exports = router;
```

Nesse caso as rotas de cada módulo estão na mesma pasta e deveriam estar na pasta de cada módulo, por exemplo:

```js
const router = require('express').Router();

const MODULES_PATH = './../../modules/'

router.get('/', function(request, response, next) {
  response.send('PONG');
})
router.use('/customers', require(MODULES_PATH + 'Customer/routes'));
router.use('/orders', require(MODULES_PATH + 'Order/routes'));
router.use('/postalcodes', require(MODULES_PATH + 'Postalcode/routes'));
router.use('/products', require(MODULES_PATH + 'Product/routes'));
router.use('/referencePoints', require(MODULES_PATH + 'ReferencePoint/routes'));

module.exports = router;
```

Porém é mais interessante fazer uma função para ler todos os `routes.js` dentro de `modules/*` e gerar essas rotas para que não precisemos adicioná-las manualmente em nenhum lugar.

### Mongoose

**Refatoração NÃO OBRIGATÓRIA!!!**

> É aqui onde o Atomic Design, by Suissa, entra!

Vamos pegar o *Schema* de *Order* como exemplo:

```js
const mongoose = require('../../config/MongooseConfig');

const OrderSchema = mongoose.Schema({
  _customer: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Customer' },
  customer: {
    givenName: { type: String, trim: true, required: true },
    familyName: { type: String, trim: true },
    telephone: { type: String }
  },
  createdAt: { type: Date, default: Date.now },
  items: [{
    name: { type: String },
    price: { type: Number },
    quantity: { type: Number }
  }],
  gifts: [{
    name: { type: String },
    price: { type: Number },
    quantity: { type: Number }
  }],
  delivery: {
    price: { type: Number },
    courier: { type: String },
    date: { type: Date }
  },
  payment: {
    discount: { type: Number },
    moneyTotal: { type: Number },
    total: { type: Number },
    change: { type: Number },
    paymentType: { type: String }
  },
  origin: {
    _externalId: { type: String },
    name: { type: String }
  },
  shippingAddress: {
    streetAddress: { type: String },
    number: { type: Number },
    district: { type: String },
    complement: { type: String },
    referencePoint: { type: String },
    addressLocality: { type: String },
    addressRegion: { type: String },
    postalCode: { type: String, maxlength: 9 },
    location: {
      lat: { type: Number },
      lng: { type: Number }
    }
  }
});


module.exports = OrderSchema;
```

> Você percebeu que alguns campos se repetem né?

Sim! Como esses:

- name: { type: String } // 3x
- price: { type: Number } // 3x
- quantity: { type: Number } // 2x

**Fora o `createdAt` que aparece em todos os *Schemas*!**

Para atomizar isso precisamos separar cada campo como um módulo externo, vamos fazer para o campo `name`, criando o arquivo na raíz do projeto `/fields/name.js`:

```js
module.exports = { type: String }
``` 

Aí você deve se perguntar:

> Mas só para isso Suissa?

E eu respondo:

> Então... Não, não é só para isso. 

Eu, pessoalmente, acredito que o campo `name` de qualquer coisa deve ser obrigatório, pois se não como ele será identificado/conhecido? *Com _id não né!? Ninguém lembra nenhum `_id` de nada!* 

Logo vamos refatorar para:


```js
module.exports = { 
  type: String, 
  required: [true, 'O nome é obrigatório!'],
  validate: {
    validator: (v) => {
      return (v !== '' && v !== ' ');
    },
    message: '{VALUE} não pode ser vazio!'
  }
}
``` 