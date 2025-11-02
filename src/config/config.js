const dotenv = require("dotenv");

dotenv.config();

module.exports = {
  token: process.env.BOT_TOKEN,
  prefix: process.env.PREFIX || "a!",
  mongoURI: process.env.MONGO_URI,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,
  port: process.env.PORT,
  developerId: process.env.DEVELOPER_ID,
  naig: ["972429739765665802"],
  bannerUrl: process.env.BANNER_URL,
  logsChannel: "1265149016790925322",
  embedColors: {
    main: "#D983C2",
    success: "#83D986",
    error: "#D98383",
    info: "#8783D9",
    warning: "#D9CE83",
  },
  tambayVcId: "1235126844882161744",
  svip: {
    enabled: false, // Toggle SVIP system: true = enabled, false = disabled
    svipRoleId: "1273915223568289812",
    boostChannelId: "1092689297645244468",
    boostrequire: "2",
    notifyChannelId: "1299228396211146802",
    categoryId: "1281642578940268606",
    //EMOJI CONFIGURATION
    emojis: {
      dotPurple: "<:tbyn_dot_purple:1265359036933472417>",
      dotGold: "<:tbyn_dot_green:1265359036933472417>",
    },
  },
};