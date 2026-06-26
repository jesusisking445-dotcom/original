const dns = require("dns").promises;

(async () => {
  try {
    console.log(await dns.resolveSrv("_xmpp-server._tcp.google.com"));
  } catch (e) {
    console.error(e);
  }
})();