
/**
 *
 *
 * BOOSTER SYSTEM REVAMPING WITH A TWIST FOR DOUBLE BOOSTERS - NAIG
 *
 *
 */

const SVIP_ROLEID = "1273915223568289812";
const GUILD_ID = "1092524387418251346";
const boostChannelID = "1092689297645244468";
const dotpurple = "<:f_dot:1094220654959665224>";

// SVIP ROLE ADD/REMOVE SYSTEM
client.on("guildMemberUpdate", async (oldMember, newMember) => {
  if (oldMember.premiumSince !== newMember.premiumSince) {
    const oldBoostCount = oldMember.premiumSince
      ? oldMember.premiumSince.length
      : 0;
    const newBoostCount = newMember.premiumSince
      ? newMember.premiumSince.length
      : 0;

    if (oldBoostCount < 2 && newBoostCount >= 2) {
      await newMember.roles.add(SVIP_ROLEID);
      logger.ingoG(`Added SVIP role to ${newMember.user.tag}`);
    } else if (oldBoostCount >= 2 && newBoostCount < 2) {
      await newMember.roles.remove(SVIP_ROLEID);
      logger.infoR(`Removed SVIP role from ${newMember.user.tag}`);
    }
  }
});

// single boost
client.on("messageCreate", (message) => {
  if (
    message.type === 8 ||
    message.type === 9 ||
    message.type === 10 ||
    message.type === 11
  ) {
    logger.infoY(`${message.author.username} boost the server!`);
    const Bletters = "<:3_Top2:1114919187635245066> VIP.BOOSTER";

    const iconURL = message.guild.iconURL();
    const ServerboostCount = message.guild.premiumSubscriptionCount;

    const embed = new EmbedBuilder()
      .setTitle(`${Bletters}`)
      .setAuthor({
        name: message.author.username,
        iconURL: message.author.displayAvatarURL({ dynamic: true }),
      })
      .setDescription(
        `<a:bb_mochi:1095619067550908457> Here are the list of the VIP Guest perks.\n${dotpurple} Bypass all the guest permission.\n${dotpurple} Can change nickname.\n${dotpurple} Unlock VIP Guest room.\n${dotpurple} 500k worth of casino coins role income every week.\n${dotpurple} 1k exp bonus for first boost and additional 1k exp for 2nd boost.`
      )
      .setImage(
        "https://cdn.discordapp.com/attachments/1102122941854007327/1280523314879664282/TBYN-SINGLEBOOST.png"
      )
      .setColor("#ff73fa")
      .setFooter({
        text: `Thank You ${message.author.username} For Boosting! | Total Boosts: ${ServerboostCount}`,
        iconURL,
      })
      .setTimestamp();

    const boostChannel = client.channels.cache.get(boostChannelID);

    if (boostChannel) {
      boostChannel.send({
        content: `<@${message.author.id}> <a:wohooo:1287744665176641637>`,
        embeds: [embed],
      });
    } else {
      logger.error("Target channel not found");
    }
  }
});

//double boost
client.on("guildMemberUpdate", async (oldMember, newMember) => {
  // Check if the user had boosts and no longer has enough boosts
  const oldBoost = oldMember.premiumSinceTimestamp;
  const newBoost = newMember.premiumSinceTimestamp;

  if (!oldBoost && newBoost) {
    await handledDoubleBoost(newMember.guild, newMember);
  }
});

async function handledDoubleBoost(guild, member) {
  // Fetch all members to get the updated boost count
  await guild.members.fetch();

  // Get the member's boost count
  const userBoosts = member.premiumSinceTimestamp ? 1 : 0;
  const isUserBooster = userBoosts >= 0;

  if (!isUserBooster || userBoosts >= 2) {
    if (!member.roles.cache.has(SVIP_ROLEID)) {
      await member.roles.add(SVIP_ROLEID);
      logger.infoY(`Added SVIP role to ${member.user.tag}`);

      const shoutoutChannel = guild.channels.cache.get(boostChannelID);
      if (shoutoutChannel) {
        const ServerboostCount = guild.premiumSubscriptionCount;
        const dotgold = "<:f_DotVibezY:1095707031224188938>";
        const BigsLetters = "<:2_Top3:1114919210309660682> SVIP.Twice Booster";
        const iconURL = guild.iconURL();
        const embed = new EmbedBuilder()
          .setTitle(`${BigsLetters}`)
          .setAuthor({
            name: member.user.username,
            iconURL: member.user.displayAvatarURL({ dynamic: true }),
          })
          .setDescription(
            `<a:bb_mochi:1095619067550908457> Here are the list of the SVIP Guest perks.\n${dotgold} Role of **SVIP.TWICE BOOSTER**\n${dotgold} Bypass all the guest permission.\n${dotgold} Dedicated Shoutouts: \n\`Shoutout to ${member.user.username}. Thank you for boosting us twice.\`\n${dotgold} Can change nickname.\n${dotgold} Unlock SVIP Guest room.\n${dotgold} Early Access to Events\n${dotgold} Increased exp award - 2k exp boost\n${dotgold} A special channel for TWICE BOOSTERS\n${dotgold} Doubled Casino Coin Income - 1M worth of casino coins role income every week.\n${dotgold} Can **Create/Edit/Give** a custom role and temporary personal VC (1-Month) and give other users a temporary booster role.`
          )
          .setImage(
            "https://cdn.discordapp.com/attachments/1102122941854007327/1279470083948675174/TYFDB-GOLD.png"
          )
          .setColor("#ffd700")
          .setFooter({
            text: `Special Thanks ${member.user.username} for Twice Boosting! | Total Boosts: ${ServerboostCount}`,
            iconURL,
          })
          .setTimestamp();
        shoutoutChannel.send({
          embeds: [embed],
          content: `<@${member.user.id}>`,
        });
        shoutoutChannel.send({
          content: `Shoutout to <@${member.user.id}>. Thank You For Boosting **\`${guild.name}\`** Twice. <a:wohooo:1287744665176641637>`,
        });
      } else {
        logger.error("Target channel not found");
      }
    }
  }
}

//
const boostrequire = 2;
const notifyChannelId = "1299228396211146802";
exports.notifyChannelId = notifyChannelId;
const customRoleSchema = new mongoose.Schema({
  roleId: { type: String, required: true },
  roleName: String,
  roleColor: String,
  roleIcon: String,
  ownerId: String,
  trialUsers: [
    {
      userId: String,
      expiration: Date,
    },
  ],
  expirationDate: { type: Date, default: null },
  voiceChannelId: { type: String, default: null },
  expirationDateVoice: { type: Date, default: null },
  /* initials: {
          enabled: { type: Boolean, default: false },
          text: { type: String, default: "" },
          position: { type: String, enum: ["first", "last"], default: "first" },
        }, */
});

const CustomRoleMessageSchema = new mongoose.Schema({
  messageId: {
    type: String,
    required: true,
  },
});

const pendingTaskSchema = new mongoose.Schema({
  guildId: String,
  memberId: String,
  expirationTime: Date,
  customRoleId: String,
  voiceChannelId: String,
  svipRoleId: String,
});

const PendingTask = mongoose.model("PendingTask", pendingTaskSchema);
const CustomRole = mongoose.model("CustomRole", customRoleSchema);
exports.CustomRole = CustomRole;
const CustomRoleMessage = mongoose.model(
  "CustomRoleMessage",
  CustomRoleMessageSchema
);
const ClaimedRoleSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  expirationDate: { type: Date, required: true },
});

const ClaimedRole = mongoose.model("ClaimedRole", ClaimedRoleSchema);

client.on("messageCreate", async (message) => {
  if (!message.guild || message.author.bot) return;

  const [command, ...args] = message.content
    .slice(prefix.length)
    .trim()
    .split(/\s+/);

  //START OF SVIP USERS COMMANDS
  if (command === "claim-svip" || command === "svip-claim") {
    const boostCount = message.guild.premiumSubscriptionCount || 0; // Total boosts in the server
    const userBoosts = message.member.premiumSinceTimestamp ? 1 : 0; // Check if the user has boosted
    const isUserBooster = userBoosts > 0; // Determine if user is a booster

    // Ensure user has more than 2 boosts to run the command
    if (!isUserBooster || boostCount <= boostrequire) {
      return message.reply(
        "You need to boost the Tambayan 24/7 at to run this command."
      );
    }

    const specialRoleId = SVIP_ROLEID;
    const specialRole = message.guild.roles.cache.get(specialRoleId);
    if (!specialRole) {
      return message.reply("The special role could not be found.");
    }

    if (boostCount < boostrequire) {
      return message.reply(
        `You need to be a twice booster to claim the **\`${specialRole.name}\`**`
      );
    }

    const existingClaim = await ClaimedRole.findOne({
      userId: message.author.id,
    });
    if (existingClaim) {
      return message.reply(
        `You have already claimed the **\`${specialRole.name}\`**`
      );
    }

    await message.member.roles.add(specialRoleId);

    const expirationDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const newClaim = new ClaimedRole({
      userId: message.author.id,
      expirationDate,
    });
    await newClaim.save();

    await message.reply(
      `You have successfully claimed the special role **\`${specialRole.name}\`**. <a:wohooo:1287744665176641637>. Visit this channel to enjoy your perks as a twice booster! <#1275380970631200841>`
    );

    const shoutoutChannel = message.guild.channels.cache.get(boostChannelID);

    if (shoutoutChannel) {
      const guild = await client.guilds.fetch(GUILD_ID);
      const ServerboostCount = guild.premiumSubscriptionCount;
      const dotgold = "<a:t247_Ystar_rolling:1314525168491565098>";
      const BigsLetters = "<:2_Top3:1114919210309660682> SVIP.Twice Booster";
      const iconURL = message.guild.iconURL();
      const embed = new EmbedBuilder()
        .setTitle(`${BigsLetters}`)
        .setAuthor({
          name: message.author.username,
          iconURL: message.author.displayAvatarURL({ dynamic: true }),
        })
        .setDescription(
          `<a:bb_mochi:1095619067550908457> Here are the list of the SVIP Guest perks.\n${dotgold} Role of **SVIP.TWICE BOOSTER**\n${dotgold} Bypass all the guest permission.\n${dotgold} Dedicated Shoutouts: \n\`Shoutout to ${message.author.username}. Thank you for boosting us twice.\`\n${dotgold} Can change nickname.\n${dotgold} Unlock SVIP Guest room.\n${dotgold} Early Access to Events\n${dotgold} Increased exp award - 2k exp boost\n${dotgold} A special channel for TWICE BOOSTERS\n${dotgold} Doubled Casino Coin Income - 1M worth of casino coins role income every week.\n${dotgold} Can **Create/Edit/Give** a custom role and temporary personal VC (1-Month) and give other users a temporary booster role.`
        )
        .setImage(
          "https://cdn.discordapp.com/attachments/1102122941854007327/1279470083948675174/TYFDB-GOLD.png"
        )
        .setColor("#ffd700")
        .setFooter({
          text: `Special Thanks ${message.author.username} for Twice Boosting! | Total Boosts: ${ServerboostCount}`,
          iconURL,
        })
        .setTimestamp();
      shoutoutChannel.send({
        embeds: [embed],
        content: `<@${message.author.id}>`,
      });
      shoutoutChannel.send({
        content: `<@&1242778048621711413>\n## Shoutout to <@${message.author.id}>. Thank You For Boosting **\`${message.guild.name}\`** Twice. <a:wohooo:1287744665176641637>`,
      });
    }

    client.once("clientReady", () => {
      // Check for expired claimed roles every hour
      setInterval(async () => {
        try {
          const guild = client.guilds.cache.get(GUILD_ID);
          if (!guild) return;

          // Fetch all claimed roles that are expired
          const expiredClaims = await ClaimedRole.find({
            expirationDate: { $lte: new Date() },
          });

          for (const claim of expiredClaims) {
            const member = await guild.members
              .fetch(claim.userId)
              .catch(() => null);
            if (!member) continue;

            if (member.roles.cache.has(specialRoleId)) {
              await member.roles.remove(specialRoleId);

              const notifyChannel = guild.channels.cache.get(notifyChannelId);
              if (notifyChannel) {
                await notifyChannel.send({
                  content: `<@${member.user.id}> Your Twice boost has expired.`,
                });
              }
            }

            await ClaimedRole.deleteOne({ userId: member.user.id });
            logger.infoR(
              `Removed expired SVIP role from user ${member.user.tag}`
            );
          }
        } catch (error) {
          logger.error("Error checking for expired SVIP roles:", error);
        }
      }, 10 * 1000);
    });
  }

  if (command === "create-role") {
    try {
      const boostCount = message.guild.premiumSubscriptionCount || 0; // Total boosts in the server
      const userBoosts = message.member.premiumSinceTimestamp ? 1 : 0; // Check if the user has boosted
      const isUserBooster = userBoosts > 0; // Determine if user is a booster

      // Ensure user has more than 2 boosts to run the command
      if (!isUserBooster || boostCount <= boostrequire) {
        return message.reply(
          "You need to boost twice Tambayan 24/7 to run this command."
        );
      }

      const customRole = await CustomRole.findOne({
        ownerId: message.author.id,
      });
      if (customRole) {
        return message.reply("You already own a custom role.");
      }

      const modal = new ModalBuilder()
        .setCustomId("createCustomRole")
        .setTitle("Create Custom Role");

      const roleNameInput = new TextInputBuilder()
        .setCustomId("roleName")
        .setLabel("Role Name")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const roleColorInput = new TextInputBuilder()
        .setCustomId("roleColor")
        .setLabel("Role Color (HEX or RGB)")
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

      const roleIconInput = new TextInputBuilder()
        .setCustomId("roleIcon")
        .setLabel("Role Icon URL")
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

      modal.addComponents(
        new ActionRowBuilder().addComponents(roleNameInput),
        new ActionRowBuilder().addComponents(roleColorInput),
        new ActionRowBuilder().addComponents(roleIconInput)
      );

      const roleMessage = await message.reply({
        content: "Click the button below to create your custom role:",
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`createCustomRoleModal_${message.author.id}`) // Append user ID to custom ID
              .setLabel("Create Role")
              .setStyle(ButtonStyle.Success)
          ),
        ],
      });

      setTimeout(() => {
        roleMessage
          .edit({
            content:
              "Interaction has expired. Please re-run the command to use it again.",
            components: [
              new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                  .setCustomId(`createCustomRoleModal_${message.author.id}`) // Append user ID to custom ID
                  .setLabel("Create Role")
                  .setStyle(ButtonStyle.Danger)
                  .setDisabled(true)
              ),
            ],
          })
          .catch(logger.error);
      }, 2 * 60 * 1000);
    } catch (error) {
      logger.error("Error handling create-role command:", error);
      message.reply(
        "An error occurred while creating the role. Please try again."
      );
    }
    const processingUsers = new Set();
    client.on("interactionCreate", async (interaction) => {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 30);

      try {
        if (interaction.isButton()) {
          const userId = interaction.customId.split("_")[1];
          if (interaction.customId.startsWith("createCustomRoleModal")) {
            if (interaction.user.id !== userId) {
              return interaction.reply({
                content: `You cannot use this button for <@${userId}>.`,
                flags: MessageFlags.Ephemeral,
              });
            }

            const modal = new ModalBuilder()
              .setCustomId("createCustomRole")
              .setTitle("Create Custom Role");

            const roleNameInput = new TextInputBuilder()
              .setCustomId("roleName")
              .setLabel("Role Name")
              .setPlaceholder("My role name")
              .setStyle(TextInputStyle.Short)
              .setRequired(true);

            const roleColorInput = new TextInputBuilder()
              .setCustomId("roleColor")
              .setLabel("Role Color (HEX)")
              .setPlaceholder("Example: (#FFFFFF)")
              .setStyle(TextInputStyle.Short)
              .setRequired(false);

            const roleIconInput = new TextInputBuilder()
              .setCustomId("roleIcon")
              .setLabel("Role Icon URL")
              .setPlaceholder("https://image.com/icon.png")
              .setStyle(TextInputStyle.Short)
              .setRequired(false);

            modal.addComponents(
              new ActionRowBuilder().addComponents(roleNameInput),
              new ActionRowBuilder().addComponents(roleColorInput),
              new ActionRowBuilder().addComponents(roleIconInput)
            );

            await interaction.showModal(modal);
          }
        } else if (interaction.isModalSubmit()) {
          if (interaction.customId === "createCustomRole") {
            const Sdelay = 5000;

            if (processingUsers.has(interaction.user.id)) {
              return interaction.reply({
                content:
                  "Your previous submission is still being processed. Please wait.",
                flags: MessageFlags.Ephemeral,
              });
            }

            processingUsers.add(interaction.user.id);

            try {
              const roleName = interaction.fields.getTextInputValue("roleName");
              const roleColor =
                interaction.fields.getTextInputValue("roleColor") || null;
              const roleIcon =
                interaction.fields.getTextInputValue("roleIcon") || null;

              const MAX_ICON_SIZE = 2048 * 1024; // 2048 KB max size
              const HEX_REGEX = /^#([0-9A-F]{3}){1,2}$/i;
              const RGB_REGEX = /^(\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})$/;

              async function getImageSize(url) {
                try {
                  const response = await axios.head(url); // Make a HEAD request to retrieve headers only
                  const contentLength = response.headers["content-length"];
                  if (contentLength) {
                    return parseInt(contentLength, 10); // Return size in bytes
                  } else {
                    throw new Error("No content-length header found.");
                  }
                } catch (error) {
                  logger.error("Error getting image size:", error);
                  throw new Error(
                    "Could not retrieve image size. Ensure the URL is accessible."
                  );
                }
              }

              function rgbToHex(r, g, b) {
                return (
                  "#" +
                  [r, g, b]
                    .map((val) => {
                      const hex = parseInt(val).toString(16);
                      return hex.length === 1 ? "0" + hex : hex;
                    })
                    .join("")
                );
              }

              let parsedColor = null;

              if (roleColor) {
                let hexColor = roleColor.trim();

                if (RGB_REGEX.test(hexColor)) {
                  const [, r, g, b] = hexColor.match(RGB_REGEX);
                  if ([r, g, b].some((val) => val < 0 || val > 255)) {
                    return interaction.reply({
                      content:
                        "Invalid RGB values. Each value must be between 0 and 255.",
                      flags: MessageFlags.Ephemeral,
                    });
                  }
                  hexColor = rgbToHex(r, g, b);
                } else if (!HEX_REGEX.test(hexColor)) {
                  return interaction.reply({
                    content:
                      "Invalid color format. Use HEX (e.g., #FFFFFF) or RGB.",
                    flags: MessageFlags.Ephemeral,
                  });
                }
                parsedColor = parseInt(hexColor.replace("#", ""), 16);
              }

              if (roleIcon) {
                try {
                  // Check the image size before proceeding
                  const iconSize = await getImageSize(roleIcon);
                  if (iconSize > MAX_ICON_SIZE) {
                    return interaction.reply({
                      content:
                        "The icon image exceeds the 2048 KB size limit. Please use a smaller image.",
                      flags: MessageFlags.Ephemeral,
                    });
                  }
                } catch (error) {
                  return interaction.reply({
                    content:
                      "There was an error verifying the image URL. Make sure it's a direct link to an accessible image.",
                    flags: MessageFlags.Ephemeral,
                  });
                }
              }

              const estimatedCompletionTimestamp = Math.floor(
                (Date.now() + Sdelay) / 1000
              );
              const initialResponse = await interaction.reply({
                content: `Your role is being processed. Estimated time: <t:${estimatedCompletionTimestamp}:R> seconds.`,
                flags: MessageFlags.Ephemeral,
              });

              setTimeout(async () => {
                try {
                  const targetRole = await interaction.guild.roles.fetch(
                    "1298983962395410483"
                  );
                  if (!targetRole) {
                    return interaction.followUp({
                      content:
                        "The target role to position below was not found. Please check the role ID.",
                      flags: MessageFlags.Ephemeral,
                    });
                  }

                  const role = await interaction.guild.roles.create({
                    name: roleName,
                    color: parsedColor,
                    icon: roleIcon || null,
                    reason: `Custom role created by ${interaction.user.tag}`,
                    mentionable: true,
                  });

                  await role.setPosition(targetRole.position - 1);
                  await interaction.member.roles.add(role.id); // Assign role to creator

                  await CustomRole.create({
                    ownerId: interaction.user.id,
                    roleName,
                    roleColor: roleColor || null,
                    roleIcon: roleIcon || null,
                    roleId: role.id,
                    expirationDate,
                  });

                  const expirationDatePH = new Date(
                    role.expirationDate
                  ).toLocaleDateString("en-US", { timeZone: "Asia/Manila" });

                  const embed = new EmbedBuilder()
                    .setDescription(
                      `<a:t247_starr_green:1093899957829910690> **Role Created**\n> Role Name: ${roleName}\n> Role ID: ${role.id}\n> Role Color: ${roleColor}\n> Role Icon: ${roleIcon}\n> Created By: ${interaction.user.tag}\n> Expiration Date: ${expirationDatePH}`
                    )
                    .setColor(parsedColor)
                    .setTimestamp();

                  await initialResponse.edit({
                    content: `Custom role <@&${role.id}> created successfully!`,
                    embeds: [embed],
                  });
                } catch (error) {
                  logger.error("Error creating role:", error);
                  await initialResponse.edit({
                    content:
                      "There was an error creating your role. Please try again later and report the issue in <#1093588293800697956> by clicking tech report/support.",
                  });
                }
              }, Sdelay);
            } finally {
              processingUsers.delete(interaction.user.id);
            }
          }
        }
      } catch (error) {
        logger.error("Error handling interaction:", error);
        processingUsers.delete(interaction.user.id);
      }
    });
  }

  if (command === "edit-role") {
    try {
      // Fetch the user's custom role from the database
      const customRole = await CustomRole.findOne({
        ownerId: message.author.id,
      });

      if (!customRole) {
        return message.reply("You do not own a custom role to edit.");
      }

      // Fetch the actual role from the guild
      const role = await message.guild.roles.fetch(customRole.roleId);
      if (!role) {
        return message.reply("Role not found. Please try again.");
      }

      // Define a modal to edit the role with default values populated from the existing role
      const modal = new ModalBuilder()
        .setCustomId("editCustomRole")
        .setTitle("Edit Custom Role");

      const roleNameInput = new TextInputBuilder()
        .setCustomId("roleName")
        .setLabel("Role Name")
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setPlaceholder("Current Role Name")
        .setValue(role.name || ""); // Set current role name as the default value

      const roleColorInput = new TextInputBuilder()
        .setCustomId("roleColor")
        .setLabel("Role Color (HEX)")
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setPlaceholder("#FFFFFF (HEX) No Hashtag will be not valid.")
        .setValue(role.hexColor === "#000000" ? "" : role.hexColor); // Empty if no custom color

      const roleIconInput = new TextInputBuilder()
        .setCustomId("roleIcon")
        .setLabel("Role Icon URL")
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setPlaceholder("Current Role Icon URL")
        .setValue(role.iconURL() || ""); // Set current role icon URL if available

      modal.addComponents(
        new ActionRowBuilder().addComponents(roleNameInput),
        new ActionRowBuilder().addComponents(roleColorInput),
        new ActionRowBuilder().addComponents(roleIconInput)
      );

      // Send a button for the user to open the modal
      const EditroleMessage = await message.reply({
        content: "Click the button below to edit your custom role:",
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`editCustomRoleModal_${message.author.id}`)
              .setLabel("Edit Role")
              .setStyle(ButtonStyle.Secondary)
          ),
        ],
      });

      setTimeout(() => {
        EditroleMessage.edit({
          content:
            "Interaction has expired. Please re-run the command to use it again.",
          components: [
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId(`editCustomRoleModal_${message.author.id}`)
                .setLabel("Edit Role")
                .setStyle(ButtonStyle.Danger)
                .setDisabled(true)
            ),
          ],
        }).catch(logger.error);
      }, 2 * 60 * 1000);

      // Listen for the button interaction
      const filter = (i) =>
        i.customId === `editCustomRoleModal_${message.author.id}` &&
        i.user.id === message.author.id;
      const collector = message.channel.createMessageComponentCollector({
        filter,
        time: 100000,
      });

      collector.on("collect", async (interaction) => {
        if (
          interaction.customId === `editCustomRoleModal_${message.author.id}`
        ) {
          await interaction.showModal(modal); // Show the modal with pre-filled details
        }
      });

      collector.on("end", (collected) => {
        if (collected.size === 0) {
          message.reply({
            content: "You did not interact in time!",
            flags: MessageFlags.Ephemeral,
          });
        }
      });

      // Handle modal submission and update the role
      client.on("interactionCreate", async (interaction) => {
        if (
          interaction.isModalSubmit() &&
          interaction.customId === "editCustomRole"
        ) {
          const processingUsers = new Set();

          if (processingUsers.has(interaction.user.id)) {
            return interaction.reply({
              content:
                "Your previous submission is still being processed. Please wait.",
              flags: MessageFlags.Ephemeral,
            });
          }

          processingUsers.add(interaction.user.id);

          try {
            const roleName =
              interaction.fields.getTextInputValue("roleName") || role.name;
            const roleColor =
              interaction.fields.getTextInputValue("roleColor") ||
              role.hexColor;
            const roleIcon =
              interaction.fields.getTextInputValue("roleIcon") ||
              role.iconURL();

            // Check for server boost requirement
            const boostCount = interaction.guild.premiumSubscriptionCount || 0;
            const userBoosts = interaction.member.premiumSinceTimestamp ? 1 : 0;
            const isUserBooster = userBoosts > 0;

            if (!isUserBooster || boostCount <= boostrequire) {
              return interaction.reply({
                content: "You need to boost the server to use this command.",
                flags: MessageFlags.Ephemeral,
              });
            }

            const MAX_ICON_SIZE = 1000 * 1024; // 1MB max size
            const HEX_REGEX = /^#([0-9A-F]{3}){1,2}$/i;
            const RGB_REGEX = /^(\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})$/;

            // Function to convert RGB to HEX
            function rgbToHex(r, g, b) {
              return (
                "#" +
                [r, g, b]
                  .map((val) => {
                    const hex = parseInt(val).toString(16);
                    return hex.length === 1 ? "0" + hex : hex;
                  })
                  .join("")
              );
            }

            if (roleColor) {
              let hexColor = roleColor.trim(); // Trim whitespace

              if (RGB_REGEX.test(hexColor)) {
                // If RGB format, convert to HEX
                const [, r, g, b] = hexColor.match(RGB_REGEX);
                if ([r, g, b].some((val) => val < 0 || val > 255)) {
                  return interaction.reply({
                    content:
                      "Invalid RGB values. Each value must be between 0 and 255.",
                    flags: MessageFlags.Ephemeral,
                  });
                }
                hexColor = rgbToHex(r, g, b);
              } else if (!HEX_REGEX.test(hexColor)) {
                // Check for valid HEX format, with or without #
                return interaction.reply({
                  content:
                    "Invalid color format. Use HEX (e.g., #FFFFFF or FFFFFF) or RGB (e.g., 255, 255, 255).",
                  flags: MessageFlags.Ephemeral,
                });
              }

              // Now `hexColor` contains a valid HEX color
              const parsedColor = parseInt(hexColor.replace("#", ""), 16);
              await role.setColor(parsedColor);

              // Validate icon format and size
              async function getImageSize(url) {
                try {
                  const response = await axios.head(url); // HEAD request for headers only
                  const contentLength = response.headers["content-length"];

                  if (contentLength) {
                    return parseInt(contentLength, 10); // Return size in bytes
                  } else {
                    throw new Error("No content-length header found.");
                  }
                } catch (error) {
                  logger.error("Error getting image size:", error);
                  throw new Error(
                    "Could not retrieve image size. Check if the URL is accessible."
                  );
                }
              }

              if (roleIcon) {
                try {
                  // Fetch the image size
                  const iconSize = await getImageSize(roleIcon);

                  // Check if the image size exceeds the maximum allowed size
                  if (iconSize > MAX_ICON_SIZE) {
                    return interaction.reply({
                      content: `Image size is too large. Maximum allowed size is ${
                        MAX_ICON_SIZE / 1024
                      }KB, but the provided image is ${(
                        iconSize / 1024
                      ).toFixed(2)}KB.`,
                      flags: MessageFlags.Ephemeral,
                    });
                  }
                } catch (error) {
                  // Handle cases where the image URL could not be accessed
                  return interaction.reply({
                    content:
                      "There was an error verifying the image URL. Ensure it is a direct link to an image and accessible.",
                    flags: MessageFlags.Ephemeral,
                  });
                }
              }

              // Apply the updates to the role
              await role.edit({
                name: roleName,
                color: roleColor
                  ? parseInt(roleColor.replace("#", ""), 16)
                  : null,
                icon: roleIcon || null,
              });
            }

            // Save updated role details to the database
            customRole.roleName = roleName;
            customRole.roleColor = roleColor;
            customRole.roleIcon = roleIcon;
            await customRole.save();

            await interaction.reply({
              content: "Role updated successfully!",
              flags: MessageFlags.Ephemeral,
            });
          } catch (error) {
            logger.error("Error updating role:", error);
            await interaction.reply({
              content:
                "There was an error updating your role. Please try again later.",
              flags: MessageFlags.Ephemeral,
            });
          } finally {
            processingUsers.delete(interaction.user.id);
          }
        }
      });
    } catch (error) {
      logger.error("Error handling edit-role command:", error);
      message.reply(
        "An error occurred while editing the role. Please try again."
      );
    }
  }

  if (command === "renew-trial") {
    const boostCount = message.guild.premiumSubscriptionCount || 0;
    const userBoosts = message.member.premiumSinceTimestamp ? 1 : 0;
    const isUserBooster = userBoosts > 0;

    // Ensure user has more than 2 boosts to run the command
    if (!isUserBooster || boostCount <= boostrequire) {
      return message.reply(
        "You need to boost the Tambayan 24/7 at least twice to run this command."
      );
    }

    try {
      const targetUserId = message.author.id;
      const customRole = await CustomRole.findOne({ ownerId: targetUserId });

      if (!customRole) {
        return message.reply("You do not own any custom roles.");
      }

      const expirationDateString = customRole.expirationDate; // ISO date string
      const expirationDate = new Date(expirationDateString); // Convert to Date object

      if (expirationDate) {
        const now = new Date();
        const expireHoursInMs = 24 * 60 * 60 * 1000;
        const timeUntilExpiration = expirationDate.getTime() - now.getTime();

        if (timeUntilExpiration > expireHoursInMs) {
          const hoursLeft = Math.floor(timeUntilExpiration / (60 * 60 * 1000));
          const minutesLeft = Math.floor(
            (timeUntilExpiration % (60 * 60 * 1000)) / (60 * 1000)
          );

          const exactDate = expirationDate.toLocaleString("en-US", {
            timeZone: "Asia/Manila",
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          });

          const notYetEmbedd = new EmbedBuilder()
            .setTitle("Role Not Yet Expiring")
            .setDescription(
              `\`⏳\` You can only renew your role when it is about to expire. Your role expires on **\`${exactDate}\`**, which is in \`${hoursLeft} H and ${minutesLeft} M\`.`
            )
            .setColor(embedColor)
            .setTimestamp();

          return message.reply({ embeds: [notYetEmbedd] });
        }

        // Renew the role logic
        const newExpirationDate = new Date();
        newExpirationDate.setDate(newExpirationDate.getDate() + 31);

        await CustomRole.updateOne(
          { ownerId: targetUserId },
          { expirationDate: newExpirationDate }
        );

        const renewEmbed = new EmbedBuilder()
          .setTitle("Role Renewed")
          .setDescription(
            "`✅` Your role has been renewed for another 1 Month."
          )
          .setColor(embedColor)
          .setTimestamp();

        await message.reply({ embeds: [renewEmbed] });
        logger.infoY(
          `[${message.author.tag} has renewed their role. \nNew expiration date: ${newExpirationDate}]`
        );
      } else {
        const noDateEmbed = new EmbedBuilder()
          .setTitle("No Expiration Date")
          .setDescription("`❌` No expiration date found for this role.")
          .setColor(embedColor)
          .setTimestamp();

        await message.reply({ embeds: [noDateEmbed] });
      }
    } catch (error) {
      logger.error("Error handling renew-trial command:", error);
      const errorEmbed = new EmbedBuilder()
        .setTitle("Error")
        .setDescription("`⚠️` An error occurred while processing your request.")
        .setColor(embedColor)
        .setTimestamp();

      await message.reply({ embeds: [errorEmbed] });
    }
  }

  if (command === "add-trial") {
    try {
      const boostCount = message.guild.premiumSubscriptionCount || 0; // Total boosts in the server
      const userBoosts = message.member.premiumSinceTimestamp ? 1 : 0; // Check if the user has boosted
      const isUserBooster = userBoosts > 0; // Determine if user is a booster

      // Ensure user has more than 2 boosts to run the command
      if (!isUserBooster || boostCount <= boostrequire) {
        return message.reply(
          "You need to boost the Tambayan 24/7 at least twice to run this command."
        );
      }

      // Extract arguments
      const userMentionOrId = args[0];
      const duration = args[1];

      // Validate arguments
      if (!userMentionOrId || !duration) {
        return message.reply(
          "Please provide a user mention or ID, and a valid duration.\n\n **Example:** `t!add-trial @user|user-id 7d`"
        );
      }

      // Fetch custom role for the owner
      const customRole = await CustomRole.findOne({
        ownerId: message.author.id,
      });
      if (!customRole) {
        return message.reply("You do not own any custom roles.");
      }

      // Restrict to 10 trial users
      if (customRole.trialUsers.length >= 40) {
        return message.reply(
          "The maximum number of trial users (40) for this role has been reached."
        );
      }

      // Parse the user mention or ID
      let targetUserId;
      if (userMentionOrId.startsWith("<@") && userMentionOrId.endsWith(">")) {
        targetUserId = userMentionOrId.replace(/[<@!>]/g, "");
      } else {
        targetUserId = userMentionOrId;
      }

      if (
        isNaN(targetUserId) ||
        targetUserId.length < 16 ||
        targetUserId.length > 20
      ) {
        return message.reply(
          "The ID you provided doesn't look valid. Please use a proper mention or numeric user ID."
        );
      }

      // Fetch target user
      const targetUser = await message.guild.members.fetch(targetUserId);
      if (!targetUser) {
        return message.reply("User not found.");
      }

      // Check if the user is the owner
      if (targetUser.id === message.author.id) {
        return message.reply("You cannot add yourself to your own trial role.");
      }

      // Handle "permanent" duration
      let expirationDate;
      if (
        duration.toLowerCase() === "permanent" ||
        "infinity" ||
        "forever" ||
        "never"
      ) {
        expirationDate = new Date(9999, 0, 1); // Set expiration date far in the future
      } else {
        // Limit duration to a maximum of 7 days or validate other formats
        const durationMs = ms(duration);
        const durationRegex = /^\d+[smhd]$/; // Regular expression to match valid duration format

        if (
          !durationRegex.test(duration) ||
          !durationMs ||
          durationMs > ms("7d")
        ) {
          return message.reply(
            "Invalid duration format or duration exceeds the allowed limit of 1 week (7 days).\n" +
              "Alternatively, use the keyword `permanent` for a permanent duration.\n" +
              "**Usage:**\n" +
              "- `1s` (seconds)\n" +
              "- `2m` (minutes)\n" +
              "- `1h` (hours)\n" +
              "- `2d` (days)\n" +
              "- `7d` (1 week)\n" +
              "- `permanent` (never expires)\n\n" +
              "Example: `t!add-trial @user permanent`"
          );
        }

        expirationDate = new Date(Date.now() + durationMs);
      }

      // Add the trial user
      customRole.trialUsers.push({
        userId: targetUserId,
        expiration: expirationDate,
      });
      await customRole.save();

      // Assign the custom role to the target user
      await targetUser.roles.add(customRole.roleId);

      // Notify the owner
      await message.reply(
        `Assigned the custom role to <@${targetUserId}> for ${
          duration.toLowerCase() === "permanent"
            ? "a permanent duration"
            : duration
        }.`
      );

      // Schedule role removal after the trial period ends (if not permanent)
      if (duration.toLowerCase() !== "permanent") {
        const trialUserRemoval = async () => {
          const updatedCustomRole = await CustomRole.findOne({
            ownerId: message.author.id,
          });
          const trialUser = updatedCustomRole.trialUsers.find(
            (user) => user.userId === targetUserId
          );

          if (trialUser && trialUser.expiration <= new Date()) {
            const user = await message.guild.members.fetch(targetUserId);
            if (user) {
              await user.roles.remove(customRole.roleId);
            }
            await CustomRole.updateOne(
              { ownerId: message.author.id },
              {
                $pull: { trialUsers: { userId: targetUserId } },
              }
            );

            await message.channel.send(
              `The trial period for <@${targetUserId}> has ended, and the custom role has been removed.`
            );
          }
        };

        // Delay the role removal until the expiration time
        setTimeout(trialUserRemoval, ms(duration));
      }
    } catch (error) {
      logger.error("Error adding trial user:", error);
      message.reply("An error occurred while adding the trial user.");
    }
  }

  if (command === "remove-trial") {
    // Restrics the users who don't even boost
    const boostCount = message.guild.premiumSubscriptionCount || 0; // Total boosts in the server
    const userBoosts = message.member.premiumSinceTimestamp ? 1 : 0; // Check if the user has boosted
    const isUserBooster = userBoosts > 0; // Determine if user is a booster

    // Ensure user has more than 2 boosts to run the command
    if (!isUserBooster || boostCount <= boostrequire) {
      return message.reply(
        "You need to boost the Tambayan 24/7 at to run this command."
      );
    }

    const userMentionOrId = args[0];

    if (!userMentionOrId) {
      return message.reply("Please provide a user mention or ID.");
    }

    const customRole = await CustomRole.findOne({ ownerId: message.author.id });
    if (!customRole) {
      return message.reply("You do not own any custom roles.");
    }

    let targetUserId;
    if (userMentionOrId.startsWith("<@") && userMentionOrId.endsWith(">")) {
      targetUserId = userMentionOrId.replace(/[<@!>]/g, "");
    } else {
      targetUserId = userMentionOrId;
    }

    const targetUser = await message.guild.members.fetch(targetUserId);
    if (!targetUser) {
      return message.reply("User not found.\nMention or user ID");
    }

    if (
      isNaN(targetUserId) ||
      targetUserId.length < 16 ||
      targetUserId.length > 20
    ) {
      return message.reply(
        "The ID you provided doesn't look valid. Please use a proper mention or numeric user ID."
      );
    }

    if (targetUser.id === message.author.id) {
      return message.reply(
        "You cannot remove yourself to your own trial role."
      );
    }

    const trialUser = customRole.trialUsers.find(
      (user) => user.userId === targetUserId
    );
    if (!trialUser) {
      return message.reply("No trial role found for this user.");
    }

    await targetUser.roles.remove(customRole.roleId);

    const ownerVc = message.guild.channels.cache.get(customRole.voiceChannelId);
    if (ownerVc?.members.has(targetUserId)) {
      await targetUser.voice.disconnect();
    }

    await CustomRole.updateOne(
      { ownerId: message.author.id },
      {
        $pull: { trialUsers: { userId: targetUserId } },
      }
    );

    await message.reply(`Removed the custom role from <@${targetUserId}>.`);
  }

  if (command === "request-trial") {
    const roleId = args[0];

    // If no role ID is provided
    if (!roleId) {
      return message.reply(
        "Please provide the role ID.\n**Usage:** `t!request-trial <role-id>`"
      );
    }

    // Find the custom role based on the role ID
    const customRole = await CustomRole.findOne({ roleId });
    if (!customRole) {
      return message.reply(
        "This role is not available for request.\n**Usage:** `t!request-trial <role-id>`"
      );
    }

    if (customRole.trialUsers.length >= 10) {
      return message.reply(
        "The maximum number of trial users (10) for this role has been already reached."
      );
    }

    // Check if the role exists in the guild
    const role = message.guild.roles.cache.get(roleId);
    if (!role) {
      return message.reply(
        "Role not found.\n**Usage:** `t!request-trial <role-id>`"
      );
    }

    if (customRole.ownerId === message.author.id) {
      return message.reply("You cannot request your own trial role.");
    }

    if (message && message.channel) {
      await message.reply(
        "Please specify the duration for the trial role. Use formats like\n" +
          "**Usage:**\n" +
          "- `1s` (seconds)\n" +
          "- `2m` (minutes)\n" +
          "- `1h` (hours)\n" +
          "- `2d` (days)\n" +
          "- `7d` (1 week)\n\n" +
          "Send the **Duration** after the command."
      );
    }

    // Wait for duration input
    const filter = (response) => response.author.id === message.author.id;
    let durationMsg;
    try {
      durationMsg = await message.channel.awaitMessages({
        filter,
        max: 1,
        time: 60000,
        errors: ["time"],
      });
    } catch (err) {
      return message.reply(
        "You did not provide a valid duration in time. Please try the command again and specify the duration.\n" +
          "**Usage:** `t!request-trial <role-id>` followed by the **Duration**."
      );
    }

    // Parse and validate the duration
    const duration = durationMsg.first().content;
    const durationMs = ms(duration);
    const durationRegex = /^\d+[smhd]$/; // Regular expression to match valid duration format

    // Check if the duration is valid
    if (!durationRegex.test(duration) || !durationMs || durationMs > ms("7d")) {
      return message.reply(
        "Invalid duration format or duration exceeds the allowed limit of 1 week (7 days).\n" +
          "**Usage:**\n" +
          "- `1s` (seconds)\n" +
          "- `2m` (minutes)\n" +
          "- `1h` (hours)\n" +
          "- `2d` (days)\n" +
          "- `7d` (1 week)\n\n" +
          "Example: `t!request-trial <role-id>` followed by the **Duration**."
      );
    }

    await message.reply(
      `Your request for the role **${role.name}** for **${duration}** has been sent here in the <#1281853104257765447> channel!`
    );

    // Request channel verification
    const requestChannel = message.guild.channels.cache.get(
      "1281853104257765447"
    );
    if (!requestChannel) {
      return message.reply(
        "Request channel not found. Please contact an administrator."
      );
    }

    const confirmationEmbed = new EmbedBuilder()
      .setTitle("Role Request")
      .setDescription(
        `${message.author.tag} is requesting the role ${role.name} for ${duration}.`
      )
      .setColor(embedColor)
      .setFooter({ text: "Role Request System" });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("confirm")
        .setLabel("Confirm")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("deny")
        .setLabel("Deny")
        .setStyle(ButtonStyle.Danger)
    );

    const requestMessage = await requestChannel.send({
      content: `<@${customRole.ownerId}>`,
      embeds: [confirmationEmbed],
      components: [row],
    });

    const buttonFilter = (i) => i.user.id === customRole.ownerId;
    const collector = requestMessage.createMessageComponentCollector({
      filter: buttonFilter,
      componentType: ComponentType.Button,
      time: 6 * 60 * 60 * 1000,
    });

    collector.on("collect", async (i) => {
      if (i.customId === "confirm") {
        await i.update({
          content: `Confirmed! Assigning role to ${message.author.tag} for ${duration}.`,
          components: [],
        });

        // Assign the role to the user
        const member = await message.guild.members.fetch(message.author.id);
        await member.roles.add(role);

        // Save the trial user with expiration in the database
        customRole.trialUsers.push({
          userId: message.author.id,
          expiration: new Date(Date.now() + durationMs),
        });
        await customRole.save();

        await message.reply(
          `The role ${role.name} has been assigned to you for ${duration}.`
        );

        // Remove the role after the trial duration
        setTimeout(async () => {
          const updatedCustomRole = await CustomRole.findOne({
            roleId,
          });
          const trialUser = updatedCustomRole.trialUsers.find(
            (user) => user.userId === message.author.id
          );

          if (trialUser && trialUser.expiration <= new Date()) {
            const user = await message.guild.members.fetch(message.author.id);
            if (user) {
              await user.roles.remove(roleId);
              await message.channel.send(
                `The trial period for <@${message.author.id}> has ended, and the role has been removed.`
              );
            }

            // Update the database to remove the user
            await CustomRole.updateOne(
              { roleId },
              { $pull: { trialUsers: { userId: message.author.id } } }
            );
          }
        }, durationMs);
      } else if (i.customId === "deny") {
        await i.update({
          content: `Denied! ${message.author.tag} will not receive the role.`,
          components: [],
        });
        await message.reply("Your request was denied.");
      }
    });

    collector.on("end", (collected) => {
      if (collected.size === 0) {
        requestMessage.edit({
          content:
            "No response from the role owner within 6 hours. Request timed out. Try again later.",
          components: [],
        });
      }
    });
  }

  if (command === "create-voice") {
    try {
      const boostCount = message.guild.premiumSubscriptionCount || 0; // Total boosts in the server
      const userBoosts = message.member.premiumSinceTimestamp ? 1 : 0; // Check if the user has boosted
      const isUserBooster = userBoosts > 0; // Determine if user is a booster

      // Ensure user has more than 2 boosts to run the command
      if (!isUserBooster || boostCount <= boostrequire) {
        return message.reply(
          "You need to boost the Tambayan 24/7 at to run this command."
        );
      }

      // Find the user's custom role
      const customRole = await CustomRole.findOne({
        ownerId: message.author.id,
      });

      if (!customRole) {
        return message.reply("You do not own any custom roles.");
      }

      // Check if a voice channel already exists
      if (customRole.voiceChannelId) {
        const existingChannel = await message.guild.channels
          .fetch(customRole.voiceChannelId)
          .catch(() => null);

        if (existingChannel) {
          return message.reply(
            "You already have a voice channel created. You can only create one voice channel at a time."
          );
        } else {
          // Clear invalid voice channel data if the channel no longer exists
          customRole.voiceChannelId = null;
          customRole.expirationDateVoice = null;
          await customRole.save();
          logger.info(`Cleared invalid data for user ${message.author.id}`);
        }
      }

      // Create the new voice channel
      const ownerRole = await message.guild.roles.fetch(customRole.roleId);
      if (!ownerRole) {
        return message.reply("Could not find your custom role.");
      }

      const voiceChannel = await message.guild.channels.create({
        name: `${customRole.roleName}'s Voice Channel`,
        type: ChannelType.GuildVoice,
        parent: "1281642578940268606", // Example parent ID
        userLimit: 10,
        permissionOverwrites: [
          {
            id: message.guild.roles.everyone.id,
            deny: [PermissionsBitField.Flags.Connect],
            allow: [PermissionsBitField.Flags.ViewChannel],
          },
          {
            id: ownerRole.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.Connect,
              PermissionsBitField.Flags.Speak,
              PermissionsBitField.Flags.UseVAD,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.EmbedLinks,
              PermissionsBitField.Flags.AttachFiles,
              PermissionsBitField.Flags.AddReactions,
            ],
          },
          {
            id: message.author.id, // Owner
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.Connect,
              PermissionsBitField.Flags.ManageChannels,
              PermissionsBitField.Flags.Speak,
              PermissionsBitField.Flags.MoveMembers,
              PermissionsBitField.Flags.MuteMembers,
              PermissionsBitField.Flags.DeafenMembers,
              PermissionsBitField.Flags.UseVAD,
            ],
          },
        ],
      });

      // Set the expiration date (3 weeks from now)
      const expirationDateVoice = new Date();
      expirationDateVoice.setDate(expirationDateVoice.getDate() + 21); // Add 21 days
      customRole.voiceChannelId = voiceChannel.id;
      customRole.expirationDateVoice = expirationDateVoice;
      await customRole.save();

      // Send an embed to the channel
      const embed = new EmbedBuilder()
        .setAuthor({
          name: "Voice Channel Created",
          iconURL: message.guild.iconURL(),
        })
        .addFields(
          { name: "Channel", value: `<#${voiceChannel.id}>` },
          { name: "Owner", value: `<@${message.author.id}>` },
          { name: "Expiration", value: "3 weeks" },
          { name: "Max Capacity", value: "10" },
          {
            name: "Owner Permissions",
            value:
              "`ViewChannel, ManageChannel, Connect, Speak, Move Members, Mute Members, Deafen Members, Use VAD`",
          },
          {
            name: `${customRole.roleName} Permissions`,
            value:
              "`ViewChannel, Connect, Speak, UseVAD, SendMessages, EmbedLinks, AttachFiles, AddReactions`",
          }
        )
        .setColor(embedColor)
        .setTimestamp();

      await voiceChannel.send({ embeds: [embed] });

      // skipcq: JS-0045
      return message.reply(
        `Voice channel created successfully: <#${voiceChannel.id}>`
      );
    } catch (error) {
      logger.error("Error creating voice channel:", error);
      // skipcq: JS-0045
      return message.reply(
        "An error occurred while creating the voice channel."
      );
    }
  }
  //END OF SVIP USERS COMMANDS

  // Staffs and admins command for the twice boosters
  if (command === "listboosters") {
    try {
      const guild = message.guild;

      await guild.members.fetch();

      const boosters = guild.members.cache.filter(
        (member) => member.premiumSince
      );
      const sortedBoosters = boosters.sort((a, b) => {
        const aCount = boostCounts[a.user.id] || 1;
        const bCount = boostCounts[b.user.id] || 1;
        return bCount - aCount;
      });

      const boosterList = sortedBoosters.map((member, index) => {
        const boostCount = boostCounts[member.user.id] || 1;
        const boostDuration = getBoostDuration(boostCount);
        return `\`${String(index + 1).padStart(
          3,
          "0"
        )}\` - \`${boostDuration}\` - <@${member.user.id}>`;
      });

      const embed = new EmbedBuilder()
        .setTitle(`${guild.name} Total Boosters: [${boosters.size}] `)
        .setDescription(
          boosterList.length > 0 ? boosterList.join("\n") : "No boosters found."
        )
        .setColor(embedColor)
        .setThumbnail(guild.iconURL())
        .setTimestamp();

      message.channel.send({ embeds: [embed] });
    } catch (error) {
      logger.error("Error fetching or displaying boosters:", error);
      message.channel.send(
        "An error occurred while fetching the list of boosters."
      );
    }
  }
  if (command === "delete-trial") {
    try {
      const staffRoleId = staffID; // Replace with your staff role ID
      const staffRole = message.guild.roles.cache.get(staffRoleId);

      // Check if the user has the staff role to use the command
      if (!staffRole || !message.member.roles.cache.has(staffRole.id)) {
        return message.reply("You do not have permission to use this command.");
      }

      const args = message.content.split(" ").slice(1);
      if (args.length === 0) {
        return message.reply("Please provide a user mention or user ID.");
      }

      // Extract user ID from mention or raw user ID
      let userId;
      if (args[0].startsWith("<@") && args[0].endsWith(">")) {
        userId = args[0].replace(/[<@!>]/g, "");
      } else {
        userId = args[0];
      }

      // Try to find the custom role in the database for the provided user ID
      const customRole = await CustomRole.findOne({ ownerId: userId });

      if (customRole) {
        const role = message.guild.roles.cache.get(customRole.roleId);

        if (role) {
          // Delete the role from the guild
          await role.delete();
          logger.infoR(`Deleted role: ${role.name}`);
        }

        // Check and delete the voice channel if it exists
        const voiceChannel = message.guild.channels.cache.get(
          customRole.voiceChannelId
        );
        if (voiceChannel) {
          await voiceChannel.delete();
          logger.infoR(`Deleted voice channel: ${voiceChannel.name}`);
        } else {
          logger.error(
            `No voice channel found for role: ${role?.name || "Unknown"}`
          );
        }

        // Delete the custom role data from the database
        await CustomRole.deleteOne({ ownerId: userId });
        logger.infoR(`Deleted custom role data for user: ${userId}`);

        const embed = new EmbedBuilder()
          .setTitle("Trial Role and Voice Channel Deleted")
          .setDescription(
            `Trial role and associated data for <@${userId}> have been deleted.`
          )
          .setColor(embedColor)
          .setTimestamp();

        message.channel.send({ embeds: [embed] });
      } else {
        // If no role data is found for the user
        const embed = new EmbedBuilder()
          .setTitle("No Data Found")
          .setDescription(`No custom role data found for <@${userId}>.`)
          .setColor(embedColor)
          .setTimestamp();

        message.channel.send({ embeds: [embed] });
      }
    } catch (error) {
      logger.error("Error deleting trial role or voice channel:", error);

      const embed = new EmbedBuilder()
        .setTitle("Error")
        .setDescription(
          "An error occurred while deleting the trial role or voice channel."
        )
        .setColor(embedColor)
        .setTimestamp();

      message.channel.send({ embeds: [embed] });
    }
  }

  // Function to check and delete expired channels
  const deleteExpiredChannels = async () => {
    const now = new Date();
    const expiredRoles = await CustomRole.find({
      expirationDateVoice: { $lte: now },
    });

    for (const role of expiredRoles) {
      const guild = client.guilds.cache.get(guildId); // Replace with your guild ID
      if (!guild) continue;

      const voiceChannel = guild.channels.cache.get(role.voiceChannelId);
      if (voiceChannel) {
        await voiceChannel.delete();
      }

      await CustomRole.updateOne(
        { ownerId: role.ownerId },
        { $unset: { voiceChannelId: 1, expirationDateVoice: 1 } }
      );

      const owner = await guild.members.fetch(role.ownerId);
      if (owner) {
        owner.send(
          `\`❌\` Your voice channel \`${
            voiceChannel ? voiceChannel.name : "Unknown"
          }\` has been deleted after the expiration period today.`
        );
      }
    }
  };

  // Run the deleteExpiredChannels function every 2 minutes
  setInterval(deleteExpiredChannels, 1 * 60 * 1000);
});

const channelId = "1263593723120320572";
const messageID = "1314633617359638639";

client.once("clientReady", async () => {
  try {
    const guild = await client.guilds.fetch(guildId);
    const channel = await client.channels.fetch(channelId);

    const initialEmbed = new EmbedBuilder()
      .setDescription("Click the button below to open the SVIP.BOOSTER MENU")
      .setColor("#ffd700");

    const initialButton = new ButtonBuilder()
      .setCustomId("openMenu")
      .setLabel("Open Menu")
      .setStyle(ButtonStyle.Primary);

    const initialRow = new ActionRowBuilder().addComponents(initialButton);

    const gld = "<a:t247_Ystar_rolling:1314525168491565098>";
    const menuEmbed = new EmbedBuilder()
      .setDescription(
        `<:SVIP:1314521308138307615> **SVIP.BOOSTER MENU**\n\n***BUTTONS:***\n
          ${gld} **\`Create Role\`**\n> *Creates your own custom role for 1 month.*\n- **Usage:** \`Create Role\`\n> By Interacting with the button this will allow you to create a custom role for yourself that will last for one month.\n
          ${gld} **\`Edit Role\`**\n> *Edits your existing custom role.*\n- **Usage:** \`Edit Role\`\n> By Interacting with the button you can edit your current custom role. You can update the role's name, Hex color, and role's icon.\n
          ${gld} **\`Create Voice\`**\n> *Creates a voice channel, which only the role owner and the members in the role can access for 3 weeks. The channel will be automatically deleted after the 3-week period.*\n- **Usage:** \`Create Voice Channel\`\n> Just Click the interaction button and the voice channel will be created automatically.\n
          ${gld} **\`Add Trial Role\`**\n> *Owner can add a trial role period for the user (Maximum 7 days or Permanent).*\n- **Usage:** \`Add Trial\`\n> This interaction allows the owner to assign a trial period to a user, with a maximum of 1 Week or permanent.\n
          ${gld} **\`Remove Trial Role\`**\n> *Owner can remove their trial role period from the user.*\n- **Usage:** \`Remove Trial\`\n> This interaction allows the owner to remove the trial period for a specific user.\n
          ${gld} **\`Renew Trial Role\`**\n> *Notifies you first when your trial is about to expire. You must renew it within 12 hours to extend it.*\n- **Usage:** \`Renew Role\`\n> This automatically will notify you when your trial is about expire, and you'll need to renew it within 12 hours to keep it active.`
      )
      .setThumbnail(guild.iconURL({ dynamic: true, size: 4096 }))
      .setImage(
        "https://cdn.discordapp.com/attachments/1102122941854007327/1314541768091635723/SVIP_MENU.png?ex=675425ec&is=6752d46c&hm=2384fa40dd6601296c680d9993481a3eb6eb8b957fcf0b4a5392b09f49033b26&"
      )
      .setFooter({
        text: `SVIP.BOOSTER MENU | ${guild.name}`,
        iconURL: guild.iconURL(),
      })
      .setColor("#ffd700")
      .setTimestamp();

    // Send the initial message with the Open Menu button
    let initialMessage;
    try {
      initialMessage = await channel.messages.fetch(messageID);
      await initialMessage.edit({
        embeds: [initialEmbed],
        components: [initialRow],
      });
    } catch (error) {
      initialMessage = await channel.send({
        embeds: [initialEmbed],
        components: [initialRow],
      });
    }

    // Interaction handler
    client.on("interactionCreate", async (interaction) => {
      if (!interaction.isButton()) return;

      if (interaction.customId === "openMenu") {
        const row1 = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`createCustomRoleModal_${interaction.user.id}`)
            .setEmoji("1314525168491565098")
            .setLabel("Create Role")
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`editCustomRoleModal_${interaction.user.id}`)
            .setEmoji("1314525168491565098")
            .setLabel("Edit Role")
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`createVoiceChannel_${interaction.user.id}`)
            .setEmoji("1314525168491565098")
            .setLabel("Create Voice Channel")
            .setStyle(ButtonStyle.Success)
            .setDisabled(true)
        );

        const row2 = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`addTrialUser_${interaction.user.id}`)
            .setEmoji("1314525168491565098")
            .setLabel("Add Trial")
            .setStyle(ButtonStyle.Success)
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId(`removeTrialUser_${interaction.user.id}`)
            .setEmoji("1314525168491565098")
            .setLabel("Remove Trial")
            .setStyle(ButtonStyle.Danger)
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId(`renewRole_${interaction.user.id}`)
            .setEmoji("1314525168491565098")
            .setLabel("Renew Role")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true)
        );

        await interaction.reply({
          embeds: [menuEmbed],
          components: [row1, row2],
          flags: MessageFlags.Ephemeral,
        });
      }
    });

    // Schedule periodic updates
    setInterval(async () => {
      const updatedMessage = await channel.messages.fetch(messageID);
      await updatedMessage.edit({
        embeds: [initialEmbed],
        components: [initialRow],
      });
    }, 60 * 60 * 1000); // Update every hour
  } catch (error) {
    logger.error("Error sending SVIP menu:", error);
  }
});

/**
 *
 *
 * SVIP INTEREACTION
 *
 *
 */

// FOR CREATE ROLE INTERACTION

// FOR EDIT ROLE INTERACTION

// FOR VOICE CREATE INTERACTION
//pending

// Periodic task to check pending tasks
cron.schedule("*/5 * * * *", async () => {
  // Runs every 5 minutes
  const now = new Date();
  const pendingTasks = await PendingTask.find({
    expirationTime: { $lte: now },
  });

  for (const task of pendingTasks) {
    const guild = await client.guilds.fetch(task.guildId);
    const member = await guild.members.fetch(task.memberId);

    const recheckBoosts = member.premiumSinceTimestamp ? 1 : 0;

    const notifyChannel = guild.channels.cache.get(notifyChannelId); // Replace with your specific channel ID

    if (recheckBoosts >= 2) {
      // User re-boosted, ignore expiration
      const ignoreEmbed = new EmbedBuilder()
        .setTitle("Boost Reinstated")
        .setDescription(
          `\`✅\` <@${task.memberId}>, thank you for re-boosting! Your custom role will not expire.`
        )
        .setColor(embedColor)
        .setTimestamp();

      if (notifyChannel) {
        await notifyChannel.send({
          embeds: [ignoreEmbed],
          content: `<@${task.memberId}>`,
        });
      }

      // Remove the pending task from the database
      await PendingTask.deleteOne({ _id: task._id });
    } else {
      // User didn't re-boost, proceed with role deletion
      const role = guild.roles.cache.get(task.customRoleId);
      const voiceChannel = guild.channels.cache.get(task.voiceChannelId);
      const svipRole = guild.roles.cache.get(task.svipRoleId);

      if (role) await role.delete();
      if (voiceChannel) await voiceChannel.delete();
      if (svipRole && member.roles.cache.has(svipRole.id)) {
        await member.roles.remove(svipRole);
      }

      // Clean up database entry
      await CustomRole.deleteOne({ ownerId: task.memberId });

      const expiredEmbed = new EmbedBuilder()
        .setTitle("Custom Role Expired")
        .setDescription(
          `\`❌\` <@${task.memberId}>, your custom role has been deleted due to not re-boosting within 24 hours.`
        )
        .setColor(embedColor)
        .setTimestamp();

      if (notifyChannel) {
        await notifyChannel.send({
          embeds: [expiredEmbed],
          content: `<@${task.memberId}>`,
        });
      }

      // Remove the pending task from the database
      await ClaimedRole.deleteOne({ userId: task.memberId });
      await PendingTask.deleteOne({ _id: task._id });
    }
  }
});

// Add event listener for boost status changes
client.on("guildMemberUpdate", async (oldMember, newMember) => {
  // Check if the user had boosts and no longer has enough boosts
  const oldBoost = oldMember.premiumSinceTimestamp;
  const newBoost = newMember.premiumSinceTimestamp;

  if (oldBoost && !newBoost) {
    await handleBoostChange(newMember.guild, newMember);
  }
});

// Function to handle boost removal or drop below the required boost count
async function handleBoostChange(guild, member) {
  const userBoosts = member.premiumSinceTimestamp ? 1 : 0;
  const isUserBooster = userBoosts > 0;
  const now = new Date();
  // Fetch custom role from the database
  const task = await PendingTask.find({
    expirationTime: { $lte: now },
  });
  const customRole = await CustomRole.findOne({ ownerId: member.id });

  // Check if the user no longer has 2 boosts
  if (!isUserBooster || userBoosts < 2) {
    await member.roles.remove(SVIP_ROLEID);
    await ClaimedRole.deleteOne({ userId: task.memberId });
    if (customRole) {
      const notifyChannel = guild.channels.cache.get(notifyChannelId); // Replace with your specific channel ID

      const warningEmbed = new EmbedBuilder()
        .setTitle("Custom Role Expiry Warning")
        .setDescription(
          `\`⚠️\` <@${member.id}>, you no longer have 2 boosts in the server. Your custom role will expire in 24 hours unless you re-boost. If you re-boost, the expiration will be ignored.`
        )
        .setColor(embedColor)
        .setTimestamp();

      // Notify the user in the specific channel
      if (notifyChannel) {
        await notifyChannel.send({
          embeds: [warningEmbed],
          content: `<@${member.id}>`,
        });
      }

      // Save the pending task to the database
      const expirationTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
      await PendingTask.create({
        guildId: guild.id,
        memberId: member.id,
        expirationTime,
        customRoleId: customRole.roleId,
        voiceChannelId: customRole.voiceChannelId,
        svipRoleId: SVIP_ROLEID,
      });
    }
  }
}

// Detect if a member has left the server
client.on("guildMemberRemove", async (member) => {
  const customRole = await CustomRole.findOne({ ownerId: member.id });
  const guild = member.guild;

  if (customRole) {
    const role = guild.roles.cache.get(customRole.roleId);
    const voiceChannel = guild.channels.cache.get(customRole.voiceChannelId);
    const svipRole = guild.roles.cache.get("1273915223568289812");

    if (role) await role.delete();
    if (voiceChannel) await voiceChannel.delete();

    if (svipRole && member.roles.cache.has(svipRole.id)) {
      await member.roles.remove(svipRole);
    }

    // Clean up database entry
    await ClaimedRole.deleteOne({ userId: member.id });
    await CustomRole.deleteOne({ ownerId: member.id });

    const leaveEmbed = new EmbedBuilder()
      .setTitle("Member Left: Custom Role Deleted")
      .setDescription(
        `\`❌\` <@${member.id}> has left the server. Their custom role and data have been deleted.`
      )
      .setColor(embedColor)
      .setTimestamp();

    const notifyChannel = guild.channels.cache.get(notifyChannelId); // Replace with your specific channel ID
    if (notifyChannel) {
      await notifyChannel.send({ embeds: [leaveEmbed] });
    }
  }
});

// const durationMs = 21 * 24 * 60 * 60 * 1000;
// setTimeout(async () => {
//   try {
//     const updatedCustomRole = await CustomRole.findOne({
//       ownerId: interaction.user.id,
//     });
//     const trialUser = updatedCustomRole.trialUsers.find(
//       (user) => user.userId === targetUserId
//     );

//     if (trialUser && trialUser.expiration <= new Date()) {
//       const user = await interaction.guild.members.fetch(targetUserId);
//       if (user) {
//         await user.roles.remove(customRole.roleId);
//       }
//       await CustomRole.updateOne(
//         { ownerId: interaction.user.id },
//         {
//           $pull: { trialUsers: { userId: targetUserId } },
//         }
//       );

//       await interaction.channel.send(
//         `The trial period for <@${targetUserId}> has ended, and the custom role has been removed.`
//       );
//     }
//   } catch (error) {
//     logger.error("Error handling interaction:", error);
//     await interaction.followUp({
//       content:
//         "Something went wrong while processing your request. Please try again.",
//       flags: MessageFlags.Ephemeral,
//     });
//   }
// }, durationMs);

// Helper function to get boost duration
function getBoostDuration(boostCount) {
  if (boostCount >= 2) {
    return "2 years";
  } else if (boostCount >= 1) {
    return "1 year";
  } else {
    return "Less than 1 year";
  }
}
// Role live checker
client.once("clientReady", async () => {
  logger.success("CustomRole list checker is running.");
  try {
    const guild = await client.guilds.fetch(guildId);
    const channel = await client.channels.fetch("1284150618235338906"); // Fetch the specific channel
    const roles = await CustomRole.find(); // Fetch custom roles from the database

    if (!roles.length) {
      return channel.send("No custom roles available.");
    }

    // Create all field data first
    const allRoleFields = await Promise.all(
      roles.map(async (roleData) => {
        const role = await guild.roles.fetch(roleData.roleId); // Fetch the role from the guild
        if (!role) return null; // Skip if role doesn't exist anymore

        const owner = `<@${roleData.ownerId}>`;
        const roleId = roleData.roleId;
        const expirationDate = new Date(
          roleData.expirationDate
        ).toLocaleDateString("en-US", { timeZone: "Asia/Manila" });

        // Fetch the guild members if they are not cached
        await guild.members.fetch();

        const membersInRole = role.members.size; // Get the number of users in the role
        const userLimit = 10; // Max limit of users in the role
        const roleFull =
          membersInRole >= userLimit
            ? "**The role full already.**"
            : `${membersInRole}/${userLimit}`;

        const voiceChannel = roleData.voiceChannelId
          ? `<#${roleData.voiceChannelId}>`
          : "There is no existing voice channel";

        const bl = "<:bl:1284048560656089098>"; // Custom emoji ID

        return {
          name: `${role.name}`,
          value:
            `**<@&${role.id}>**\n` +
            `${bl}**Owner**: ${owner}\n` +
            `${bl}**Role ID**: ${roleId}\n` +
            `${bl}**Expiration**: \`${expirationDate}\`\n` +
            `${bl}**Users Limit**: ${roleFull}\n` +
            `${bl}**Voice Channel**: ${voiceChannel}\n` +
            "----------------------------------------",
        };
      })
    );

    // Filter out any null fields (from deleted roles)
    const roleFields = allRoleFields.filter((field) => field !== null);

    // Split fields into chunks to avoid Discord's character limit
    const EMBED_LIMIT = 5500; // Safe character limit for embed fields
    const embedChunks = [];
    let currentChunk = [];
    let currentLength = 0;

    for (const field of roleFields) {
      const fieldLength = field.name.length + field.value.length;

      if (currentLength + fieldLength > EMBED_LIMIT) {
        // Start a new chunk if this field would exceed the limit
        embedChunks.push([...currentChunk]);
        currentChunk = [field];
        currentLength = fieldLength;
      } else {
        // Add to current chunk
        currentChunk.push(field);
        currentLength += fieldLength;
      }
    }

    // Don't forget to add the last chunk if it has any fields
    if (currentChunk.length > 0) {
      embedChunks.push(currentChunk);
    }

    // Create embeds from chunks
    const embeds = embedChunks.map((chunk, index) => {
      return new EmbedBuilder()
        .setTitle(
          `Custom Roles to Request List ${
            embedChunks.length > 1 ? `(${index + 1}/${embedChunks.length})` : ""
          }`
        )
        .addFields(chunk)
        .setColor(embedColor)
        .setFooter({
          text: 'You can join by doing t!request "Role-ID"',
          iconURL: guild.iconURL(),
        })
        .setTimestamp();
    });

    // Find existing messages or create new ones
    const customRoleMessages = await CustomRoleMessage.find();

    // Delete any excess messages if we have too many
    if (customRoleMessages.length > embeds.length) {
      for (let i = embeds.length; i < customRoleMessages.length; i++) {
        try {
          const messageToDelete = await channel.messages.fetch(
            customRoleMessages[i].messageId
          );
          await messageToDelete.delete();
          await CustomRoleMessage.findByIdAndDelete(customRoleMessages[i]._id);
        } catch (error) {
          logger.error(`Error deleting excess message: ${error}`);
        }
      }
    }

    // Update or create messages for each embed
    for (let i = 0; i < embeds.length; i++) {
      if (i < customRoleMessages.length) {
        // Update existing message
        try {
          const messageToUpdate = await channel.messages.fetch(
            customRoleMessages[i].messageId
          );
          await messageToUpdate.edit({ embeds: [embeds[i]] });
        } catch (error) {
          logger.error(`Error updating message ${i}: ${error}`);
          // If message not found, create a new one
          const newMessage = await channel.send({ embeds: [embeds[i]] });
          customRoleMessages[i].messageId = newMessage.id;
          await customRoleMessages[i].save();
        }
      } else {
        // Create new message
        const newMessage = await channel.send({ embeds: [embeds[i]] });
        await CustomRoleMessage.create({ messageId: newMessage.id });
      }
    }

    // Schedule periodic updates
    setInterval(async () => {
      try {
        const guild = await client.guilds.fetch(guildId);
        const updatedRoles = await CustomRole.find();

        // Create updated field data
        const updatedAllRoleFields = await Promise.all(
          updatedRoles.map(async (roleData) => {
            const role = await guild.roles.fetch(roleData.roleId);
            if (!role) return null;

            const owner = `<@${roleData.ownerId}>`;
            const roleId = roleData.roleId;
            const expirationDate = new Date(
              roleData.expirationDate
            ).toLocaleDateString("en-US", { timeZone: "Asia/Manila" });

            await guild.members.fetch();

            const membersInRole = role.members.size;
            const userLimit = 10;
            const roleFull =
              membersInRole >= userLimit
                ? "**The role full already.**"
                : `${membersInRole}/${userLimit}`;
            const voiceChannel = roleData.voiceChannelId
              ? `<#${roleData.voiceChannelId}>`
              : "There is no existing voice channel";
            const bl = "<:bl:1284048560656089098>";

            return {
              name: `${role.name}`,
              value:
                `**<@&${role.id}>**\n` +
                `${bl}**Owner**: ${owner}\n` +
                `${bl}**Role ID**: ${roleId}\n` +
                `${bl}**Expiration**: \`${expirationDate}\`\n` +
                `${bl}**Users Limit**: ${roleFull}\n` +
                `${bl}**Voice Channel**: ${voiceChannel}\n` +
                "----------------------------------------",
            };
          })
        );

        // Filter out any null fields
        const updatedRoleFields = updatedAllRoleFields.filter(
          (field) => field !== null
        );

        // Split into chunks again
        const updatedEmbedChunks = [];
        let updatedCurrentChunk = [];
        let updatedCurrentLength = 0;

        for (const field of updatedRoleFields) {
          const fieldLength = field.name.length + field.value.length;

          if (updatedCurrentLength + fieldLength > EMBED_LIMIT) {
            updatedEmbedChunks.push([...updatedCurrentChunk]);
            updatedCurrentChunk = [field];
            updatedCurrentLength = fieldLength;
          } else {
            updatedCurrentChunk.push(field);
            updatedCurrentLength += fieldLength;
          }
        }

        if (updatedCurrentChunk.length > 0) {
          updatedEmbedChunks.push(updatedCurrentChunk);
        }

        // Create updated embeds
        const updatedEmbeds = updatedEmbedChunks.map((chunk, index) => {
          return new EmbedBuilder()
            .setTitle(
              `Custom Roles To Request List ${
                updatedEmbedChunks.length > 1
                  ? `(${index + 1}/${updatedEmbedChunks.length})`
                  : ""
              }`
            )
            .addFields(chunk)
            .setColor(embedColor)
            .setFooter({
              text: 'You can join by doing t!request "Role-ID"',
              iconURL: guild.iconURL(),
            })
            .setTimestamp();
        });

        // Get the current messages
        const currentMessages = await CustomRoleMessage.find();

        // Update, create, or delete messages as needed
        for (
          let i = 0;
          i < Math.max(updatedEmbeds.length, currentMessages.length);
          i++
        ) {
          if (i < updatedEmbeds.length && i < currentMessages.length) {
            // Update existing message
            try {
              const messageToUpdate = await channel.messages.fetch(
                currentMessages[i].messageId
              );
              await messageToUpdate.edit({ embeds: [updatedEmbeds[i]] });
            } catch (error) {
              logger.error(`Error updating message in interval ${i}: ${error}`);
              // If message not found, create a new one
              const newMessage = await channel.send({
                embeds: [updatedEmbeds[i]],
              });
              currentMessages[i].messageId = newMessage.id;
              await currentMessages[i].save();
            }
          } else if (i < updatedEmbeds.length) {
            // Create new message for new embed
            const newMessage = await channel.send({
              embeds: [updatedEmbeds[i]],
            });
            await CustomRoleMessage.create({ messageId: newMessage.id });
          } else {
            // Delete excess message
            try {
              const messageToDelete = await channel.messages.fetch(
                currentMessages[i].messageId
              );
              await messageToDelete.delete();
              await CustomRoleMessage.findByIdAndDelete(currentMessages[i]._id);
            } catch (error) {
              logger.error(
                `Error deleting excess message in interval: ${error}`
              );
            }
          }
        }
      } catch (error) {
        logger.error("Error updating the custom roles messages:", error);
      }
    }, 2 * 35 * 1000); // 30 seconds interval for updates
  } catch (error) {
    logger.error("Error fetching or displaying custom roles:", error);
    const channel = await client.channels.fetch("1284150618235338906");
    channel.send("An error occurred while fetching the list of custom roles.");
  }
});

// expiration custom role function
client.on("clientReady", async () => {
  await checkExpiredRoles();
  setInterval(checkExpiredRoles, 60 * 60 * 1000); // Check every 1 hour
});

async function checkExpiredRoles() {
  try {
    const customRoles = await CustomRole.find();

    for (const customRole of customRoles) {
      const now = new Date();
      const expirationDate = new Date(customRole.expirationDate);

      // Check if the role has expired
      if (expirationDate <= now) {
        // Fetch the guild using the owner ID
        const guild = client.guilds.cache.get(guildId);
        if (!guild) {
          logger.error(`Guild not found for owner ID: ${customRole.ownerId}`);
          continue;
        }

        // Fetch the role using the role ID
        const role = guild.roles.cache.get(customRole.roleId);
        if (role) {
          await role.delete();
          logger.infoR(`Deleted expired role: ${role.name}`);
        } else {
          logger.error(`Role not found: ${customRole.roleId}`);
        }

        // Remove the custom role data from the database
        await CustomRole.deleteOne({ ownerId: customRole.ownerId });
        logger.infoR(
          `Deleted custom role data for owner ID: ${customRole.ownerId}`
        );

        // Notify the role owner (User object for DMs)
        const roleOwnerUser = await client.users.fetch(customRole.ownerId);
        if (roleOwnerUser) {
          const embed = new EmbedBuilder()
            .setTitle("`❌` Custom Role Expired")
            .setDescription(
              `Your custom role **${role.name}** has expired and has been deleted.`
            )
            .setColor(embedColor)
            .setTimestamp();

          await roleOwnerUser.send({ embeds: [embed] });
        }

        // Optionally notify in a specific channel
        const notificationChannel = guild.channels.cache.get(notifyChannelId);
        if (notificationChannel) {
          const channelEmbed = new EmbedBuilder()
            .setTitle("`❌` Custom Role Expired")
            .setDescription(
              `<@${customRole.ownerId}>, your custom role **${role.name}** has expired and has been deleted.`
            )
            .setColor(embedColor)
            .setTimestamp();

          await notificationChannel.send({ embeds: [channelEmbed] });
          
          // Get GuildMember object instead of User object to access roles
          const roleOwnerMember = await guild.members.fetch(customRole.ownerId).catch(() => null);
          if (roleOwnerMember) {
            await roleOwnerMember.roles.remove(SVIP_ROLEID);
          }
        }
      } else {
        // Check if the expiration is within the next 24 hours
        const timeDiff = expirationDate - now;
        if (timeDiff > 0 && timeDiff <= 24 * 60 * 60 * 1000) {
          // Fetch the guild using the owner ID
          const guild = client.guilds.cache.get(guildId);
          if (!guild) {
            logger.error(`Guild not found for owner ID: ${customRole.ownerId}`);
            continue;
          }

          const notificationChannel = guild.channels.cache.get(notifyChannelId);
          if (!notificationChannel) {
            logger.error(
              `Notification channel not found in guild: ${guild.name}`
            );
            continue;
          }

          // Check if the role owner has already been notified
          const roleOwner = await client.users.fetch(customRole.ownerId);
          if (!roleOwner) {
            logger.error(`Role owner not found: ${customRole.ownerId}`);
            continue;
          }

          // Fetch the role using the role ID
          const role = guild.roles.cache.get(customRole.roleId);
          if (!role) {
            logger.error(`Role not found: ${customRole.roleId}`);
            continue;
          }

          const expirationTimestamp = Math.floor(
            expirationDate.getTime() / 1000
          ); // Convert to seconds

          // Create an embed message for the role owner
          const embed = new EmbedBuilder()
            .setColor(embedColor) // Set your desired color
            .setTitle("`❗` Role Expiration Reminder")
            .setDescription(
              `\`❗\` Your custom role ${role.name} is set to expire on **<t:${expirationTimestamp}:f>**.`
            )
            .addFields({
              name: "Action Required",
              value: "Please renew it if you wish to keep it.",
            })
            .setTimestamp();

          // Send a notification to the role owner
          await roleOwner.send({ embeds: [embed] });

          // Optionally send a message to the notification channel
          if (notificationChannel) {
            const channelEmbed = new EmbedBuilder()
              .setColor(embedColor) // Different color for channel notification
              .setTitle(
                "`❗` Role Expiration Reminder <:aAnnouncementtbybn:1185972648707117067>"
              )
              .setDescription(
                `<@${customRole.ownerId}>, your custom role is about to expire in\n<t:${expirationTimestamp}:f>\n> *Please renew it to avoid losing access.*\n<a:t247_starr_green:1093899957829910690>\`t!renew-trial\` at <#1275380970631200841>.`
              )
              .setTimestamp();

            await notificationChannel.send({
              embeds: [channelEmbed],
              content: `<@${customRole.ownerId}> & <@&${customRole.roleId}> <:aAnnouncementtbybn:1185972648707117067>`,
            });
          }

          // Optionally mark the role as notified to prevent duplicate notifications
          // customRole.notified = true; // Uncomment if you want to track notifications
          await customRole.save();
        }
      }
    }
  } catch (error) {
    logger.error("Error checking expired roles:", error);
  }
}

// expiration trial role for the user given function
client.on("clientReady", async () => {
  await trialExpiration();
  setInterval(trialExpiration, 10 * 1000);
});
async function trialExpiration() {
  try {
    const customRoles = await CustomRole.find();

    for (const customRole of customRoles) {
      const now = new Date();

      // Fetch the guild using the owner ID
      const guild = client.guilds.cache.get(guildId); // Ensure you have the guildId in your schema
      if (!guild) {
        logger.error(`Guild not found for owner ID: ${customRole.ownerId}`);
        continue;
      }

      // Get the notification channel (replace 'YOUR_CHANNEL_ID' with the actual channel ID)
      const notificationChannel = guild.channels.cache.get(notifyChannelId);
      if (!notificationChannel) {
        logger.error(`Notification channel not found in guild: ${guild.name}`);
        continue;
      }

      // Iterate through trial users
      for (const trialUser of customRole.trialUsers) {
        if (trialUser.expiration <= now) {
          // Fetch the member from the guild
          const user = await guild.members
            .fetch(trialUser.userId)
            .catch((error) => {
              logger.error(`Failed to fetch user ${trialUser.userId}:`, error);
              return null;
            });

          if (user) {
            // Remove the role
            await user.roles.remove(customRole.roleId).catch((error) => {
              logger.error(`Failed to remove role from ${user.userId}:`, error);
            });

            // Notify the user in the specific channel
            await notificationChannel
              .send(
                `The trial role "${customRole.roleName}" for <@${user.id}> has expired and has been removed.`
              )
              .catch((error) => {
                logger.error(
                  "Failed to send message to notification channel:",
                  error
                );
              });
          }

          // Remove the trial user from the schema
          await CustomRole.updateOne(
            { ownerId: customRole.ownerId },
            {
              $pull: { trialUsers: { userId: trialUser.userId } },
            }
          );

          logger.infoY(
            `Removed trial role from ${trialUser.userId} due to expiration.`
          );
        }
      }
    }
  } catch (error) {
    logger.error("Error checking expired roles:", error);
  }
}
// Watcher for the users trying to bypass the requesting system or add role
client.on("guildMemberUpdate", async (oldMember, newMember) => {
  try {
    // Fetch all custom roles from the database
    const customRoles = await CustomRole.find();

    // Loop through all custom roles
    for (const customRole of customRoles) {
      const trialRole = newMember.guild.roles.cache.get(customRole.roleId);

      // Check if the member has the trial role
      if (trialRole && newMember.roles.cache.has(trialRole.id)) {
        // Check if the member is in the trial users list
        const isTrialUser = customRole.trialUsers.some(
          (user) => user.userId === newMember.id
        );

        // If the member is not in the trial users list and it's not the owner
        if (!isTrialUser && customRole.ownerId !== newMember.id) {
          // Additional check: Was the role added manually?
          const fetchedAuditLogs = await newMember.guild.fetchAuditLogs({
            type: 25, // This is the correct integer for MEMBER_ROLE_UPDATE
            limit: 1,
          });

          const auditEntry = fetchedAuditLogs.entries.first();
          if (auditEntry) {
            const { executor, target, changes } = auditEntry;

            // Ensure the role update happened for the correct user
            if (
              target.id === newMember.id &&
              changes.some(
                (change) =>
                  change.key === "$add" &&
                  change.new.some((role) => role.id === trialRole.id)
              )
            ) {
              // If the role was added by someone other than the bot or the owner, remove the role
              if (
                executor.id !== client.user.id &&
                executor.id !== customRole.ownerId
              ) {
                // Remove the role
                await newMember.roles.remove(trialRole);

                // Notify the user about the role removal
                await newMember.send(
                  `You have been removed from the role ${trialRole.name} because it was added improperly. If you want this role, please ask the owner for permission and make a proper request in <#1281853104257765447>.`
                );

                // Optionally, notify the executor that they improperly added the role
                const executorMember = await newMember.guild.members.fetch(
                  executor.id
                );
                if (executorMember) {
                  executorMember.send(
                    `You attempted to add the role ${trialRole.name} to ${newMember.user.tag}, but it was removed because it must be added through the proper request process.`
                  );
                }
              }
            }
          }
        }
      }
    }
  } catch (error) {
    logger.error("Error in guildMemberUpdate event: ", error);
  }
});
