const {
  SlashCommandBuilder,
  AttachmentBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { createCanvas, loadImage } = require("canvas");
const path = require("path");
const config = require("../../config/config.js");

// Function to find the best crop area for the image
function findBestCropArea(image, targetSize) {
  const imgWidth = image.width;
  const imgHeight = image.height;

  // If image is smaller than target, return whole image
  if (imgWidth <= targetSize && imgHeight <= targetSize) {
    return { x: 0, y: 0, width: imgWidth, height: imgHeight };
  }

  // Calculate crop dimensions (square crop)
  const cropSize = Math.min(imgWidth, imgHeight);

  // Center crop as default
  let cropX = Math.max(0, (imgWidth - cropSize) / 2);
  let cropY = Math.max(0, (imgHeight - cropSize) / 2);

  // For portrait images, prefer upper portion (faces are usually in upper half)
  if (imgHeight > imgWidth) {
    cropY = Math.max(0, (imgHeight - cropSize) * 0.3); // 30% from top
  }

  // For landscape images, use center crop
  if (imgWidth > imgHeight) {
    cropX = (imgWidth - cropSize) / 2;
  }

  return {
    x: Math.floor(cropX),
    y: Math.floor(cropY),
    width: cropSize,
    height: cropSize,
  };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("sso-create")
    .setDescription(
      "Generate a custom 2160x2160 canvas with user info and uploaded image"
    )
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to feature in the canvas")
        .setRequired(true)
    )
    .addAttachmentOption((option) =>
      option
        .setName("image")
        .setDescription("Upload an image to use in the canvas")
        .setRequired(true)
    ),
  async execute(interaction) {
    await interaction.deferReply();

    // Send initial editing message with estimated time
    const estimatedTime = "3-5 seconds";
    await interaction.editReply(
      `\`🎨\` Editing your SSO Image... Estimated: ${estimatedTime}`
    );

    const startTime = Date.now();

    try {
      const targetUser = interaction.options.getUser("user");
      const uploadedImage = interaction.options.getAttachment("image"); // Validate uploaded image - support PNG, JPG, JPEG, and WEBP
      const supportedFormats = [
        "image/png",
        "image/jpeg",
        "image/jpg",
        "image/webp",
      ];
      if (
        !uploadedImage ||
        !supportedFormats.includes(uploadedImage.contentType?.toLowerCase())
      ) {
        return await interaction.editReply(
          "Please upload a valid image file (PNG, JPG, JPEG, or WEBP)."
        );
      }
      
      // Create 2160x2160 canvas (double resolution for higher quality)
      const canvas = createCanvas(2160, 2160);
      const ctx = canvas.getContext("2d");

      // Layer 1: Uploaded image as background
      const uploadedImg = await loadImage(uploadedImage.url);
      ctx.drawImage(uploadedImg, 0, 0, 2160, 2160);
      // Layer 2: Low shadow at bottom (scaled to 2x resolution)
      const lowShadow = await loadImage(
        path.join(__dirname, "../../assets/low_shadow.png")
      );
      ctx.drawImage(lowShadow, 0, 0, lowShadow.width * 2, lowShadow.height * 2); // Layer 3: Polaroid box centered (scaled to 2x resolution)
      const polaroidBox = await loadImage(
        path.join(__dirname, "../../assets/poloroid_box.png")
      );
      const polaroidX = (2160 - polaroidBox.width * 2) / 2; // Double the scale
      const polaroidY = (2160 - polaroidBox.height * 2) / 2; // Double the scale
      ctx.drawImage(
        polaroidBox,
        polaroidX,
        polaroidY,
        polaroidBox.width * 2,
        polaroidBox.height * 2
      );

      // Layer 4: User avatar (circular) and username
      const userAvatar = await loadImage(
        targetUser.displayAvatarURL({ extension: "png", size: 4096 })
      ); // Draw circular avatar at top-left INSIDE the polaroid box (scaled to 2x)
      const avatarSize = 130; // Double the size for 2x resolution
      const avatarX = polaroidX + 560; // Double the offset
      const avatarY = polaroidY + 438; // Double the offset

      ctx.save();
      ctx.beginPath();
      ctx.arc(
        avatarX + avatarSize / 2,
        avatarY + avatarSize / 2,
        avatarSize / 2,
        0,
        Math.PI * 2
      );
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(userAvatar, avatarX, avatarY, avatarSize, avatarSize);
      ctx.restore(); // Add user tag next to avatar (inside polaroid area)
      ctx.fillStyle = "#000000";
      ctx.font = "bold 40px Arial"; // Double the font size for 2x resolution
      ctx.textAlign = "left";
      ctx.fillText(
        targetUser.tag,
        avatarX + avatarSize + 30, // Double the spacing
        avatarY + avatarSize / 2 + 12 // Double the offset
      );
      
      // Layer 5: Auto-crop uploaded image for best 1060x1000 area (double resolution)
      const centerImageWidth = 1060; // Double the width for 2x resolution
      const centerImageHeight = 1000; // Double the height for 2x resolution
      const centerX =
        polaroidX + (polaroidBox.width * 2 - centerImageWidth) / 2;
      const centerY =
        polaroidY + (polaroidBox.height * 2 - centerImageHeight) / 2 + 30; // Double the offset

      // Auto-detect best crop area
      const cropArea = findBestCropArea(
        uploadedImg,
        Math.max(centerImageWidth, centerImageHeight)
      );

      ctx.drawImage(
        uploadedImg,
        cropArea.x,
        cropArea.y,
        cropArea.width,
        cropArea.height,
        centerX,
        centerY,
        centerImageWidth,
        centerImageHeight
      ); 
      // Convert canvas to buffer and send
      const buffer = canvas.toBuffer("image/png");
      const attachment = new AttachmentBuilder(buffer, {
        name: "sso-canvas.png",
        quality: 100,
      });

      // Calculate generation time
      const endTime = Date.now();
      const generationTime = ((endTime - startTime) / 1000).toFixed(2); // Create embed with the generated image
      const embed = new EmbedBuilder()
        .setTitle("`🎨` SSO Canvas Generated!")
        .setDescription(`Canvas created for ${targetUser.tag}`)
        .setImage("attachment://sso-canvas.png")
        .setColor(config.embedColors.main)
        .setFooter({
          text: `Requested by ${interaction.user.tag}`,
          iconURL: interaction.user.displayAvatarURL(),
        })
        .setTimestamp()
        .addFields({
          name: "`⏱️` Generation Time",
          value: `${generationTime} seconds`,
          inline: true,
        }); // Step 1: Send image to storage channel to get permanent Discord CDN URL
      const storageChannelId = "1265149016790925322";
      const storageChannel = await interaction.client.channels.fetch(
        storageChannelId
      );

      if (!storageChannel) {
        throw new Error("Storage channel not found");
      }

      // Send to storage channel
      const storageMessage = await storageChannel.send({
        content: `SSO image stored for ${targetUser.tag}!`,
        files: [attachment],
      });

      // Step 2: Get the permanent Discord CDN URL from storage channel
      const permanentImageUrl = storageMessage.attachments.first()?.url;

      if (!permanentImageUrl) {
        throw new Error("Failed to get permanent image URL from storage");
      }

      // Step 3: Update embed to use the permanent Discord CDN URL
      embed.setImage(permanentImageUrl);

      // Step 4: Create download button with the permanent Discord CDN URL
      const downloadButton = new ButtonBuilder()
        .setLabel("Download Image")
        .setEmoji("📥")
        .setStyle(ButtonStyle.Link)
        .setURL(permanentImageUrl);

      const row = new ActionRowBuilder().addComponents(downloadButton);

      // Step 5: Send final response with embed and button (no local attachment needed)
      await interaction.editReply({
        content: null,
        embeds: [embed], // Embed uses permanent Discord CDN URL
        files: [], // No local attachment needed
        components: [row], // Button uses same permanent Discord CDN URL
      });
    } catch (error) {
      console.error("Error creating canvas:", error);
      await interaction.editReply(
        "An error occurred while creating the canvas. Please try again."
      );
    }
  },
};
