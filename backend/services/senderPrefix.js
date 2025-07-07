module.exports = function senderPrefix(sender) {
   if (!sender) {
      return "";
   }

   const [firstNameRaw, lastNameRaw] = sender.trim().split(/\s+/);
   const firstName = firstNameRaw?.toLowerCase() || "";
   const lastName = lastNameRaw?.toLowerCase();

   const prefix = lastName ? `${firstName}.${lastName}` : firstName;

   return prefix;
};
