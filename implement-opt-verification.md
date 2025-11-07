setup dont env, ms91 (in src foleder).

create a routes.js
create a controller for msg91

---

we need to send the otp and verify it

create appropriate routes and controller

---

keep it simple
JSDoc comments
consider all the edge cases and implement proper error handling
standardize req res body structure

---

```js
export async function sendSMS({ flowId, recipients }) {
  try {
    const response = await axios.post(
      BASE_URL,
      {
        flow_id: flowId,
        recipients: recipients,
      },
      {
        headers: {
          authkey: process.env.MSG91_AUTH_KEY,
          "Content-Type": "application/json",
        },
      }
    );

import { sendSMS } from "./msg91.js";

(async () => {
  try {
    const result = await sendSMS({
      flowId: "your_flow_id_here",
      recipients: [
        {
          mobiles: "919876543210",
          name: "John Doe",
          otp: "123456", // Variables must match your MSG91 template
        },
      ],
    });
    console.log("SMS sent successfully:", result);
  } catch (err) {
    console.error(err.message);
  }
})();
```

---

Notes

flowId: Get this from MSG91 → “Flow” → select template → copy ID.

Ensure the template variables (name, otp, etc.) match what’s defined in the MSG91 Flow.

You can create multiple flows for OTP, transactional, or promotional messages.

MSG91 requires country code (91 for India).

---

Optional: OTP Verification Example

To send and verify OTPs using MSG91’s OTP API:

Send OTP

```js
const sendOtp = async (mobile) => {
  const url = `https://control.msg91.com/api/v5/otp?mobile=91${mobile}`;
  await axios.get(url, {
    headers: { authkey: process.env.MSG91_AUTH_KEY },
  });
};
```

Verify OTP

```js
const verifyOtp = async (mobile, otp) => {
  const url = `https://control.msg91.com/api/v5/otp/verify?mobile=91${mobile}&otp=${otp}`;
  const res = await axios.get(url, {
    headers: { authkey: process.env.MSG91_AUTH_KEY },
  });
  return res.data;
};
``;
```
