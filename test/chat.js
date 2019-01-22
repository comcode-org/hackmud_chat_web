var assert = require('assert');
var chat = require('../js/chat.js')
var sinon = require('sinon')
var chai = require('chai')
var chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
var should = chai.should()

let xhr, requests;
let stubToken = "0123456789"
let stubUser = "test_user"
describe('chat.js', function() {
  describe('API', function() {
    it('API exists', function() {
      assert.notStrictEqual(chat.API, undefined)
    })
  })

  before(function () {
    chat.API.get_token = sinon.fake.returns( 
      new Promise((resolve)=>{
        resolve({chat_token: stubToken})
      })
    )
    chat.API.account_data = sinon.fake.returns(
      new Promise( (resolve) => {
        resolve(
          { // dat
            ok: true,
            users: [stubUser],
        })
      })
    )
  })

  describe('Account', function() {
    describe('login', function() {
      it('allows you to login with a token directly', function(done) {
        let act = new chat.Account()
        let p = act.login(stubToken)
        p.should.be.fulfilled.then(function() {
          act.token.should.equal(stubToken)
        }).should.notify(done)
      })
      it('allows you to login with a chat_pass')
    })
  })
  describe('User', function() {

  })
  describe('Channel', function() {

  })
});

it('doesnt save the cookie if it failed to log in with it')
it('lets you send a single line message with return')
it('lets you send a multiline message')
it('does not let you send a message that is too long')
it('does not let you send a message thats too many lines')