<<<<<<< 7aafb84df28cb38915cbfb3be4cd485dff1711fe
const SCHEMA = './schema'
const CONTROLLER = './controller'
const ROUTES = './routes'
const REPOSITORY = './repository'
const NAME = __dirname.split('/').reverse()[0] // 'Customer'


module.exports = {
  mongoose,
  SCHEMA,
  NAME,
  CONTROLLER,
  REPOSITORY,
  ROUTES
}
