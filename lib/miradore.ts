import axios from "axios";
import { XMLParser } from "fast-xml-parser";

export const getMiradoreDevices = async () =>
  await axios
    .get("https://legitbee.online.miradore.com/API/Device", {
      params: {
        auth: "1_abzc7hv26dO6Jgj",
        select:
          "User.Email,User.FirstName,User.LastName,InvApplication.Identifier,InvApplication.Name,InvApplication.InventoryTime,InvApplication.Version",
      },
    })
    .then(({ data }) => {
      const parser = new XMLParser();
      const res = parser.parse(data);

      return res.Content.Items.Device;
    });
