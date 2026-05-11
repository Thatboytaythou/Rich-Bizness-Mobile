import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

/* =========================================
   RICH BIZNESS MOBILE
   STRIPE WEBHOOK ENGINE
   /api/stripe-webhook.js
========================================= */

export const config = {
  api: {
    bodyParser: false,
  },
};

/* =========================================
   ENV
========================================= */

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-03-25.dahlia",
});

const supabase = createClient(
  process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL,

  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/* =========================================
   RAW BODY
========================================= */

async function getRawBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk)
      ? chunk
      : Buffer.from(chunk)
    );
  }

  return Buffer.concat(chunks);
}

/* =========================================
   MAIN HANDLER
========================================= */

export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {

    const sig =
      req.headers["stripe-signature"];

    if (!sig) {
      return res.status(400).json({
        error: "Missing stripe signature"
      });
    }

    const rawBody = await getRawBody(req);

    const webhookSecret =
      process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      return res.status(500).json({
        error: "Missing webhook secret"
      });
    }

    /* =========================================
       VERIFY EVENT
    ========================================= */

    let event;

    try {

      event = stripe.webhooks.constructEvent(
        rawBody,
        sig,
        webhookSecret
      );

    } catch (err) {

      console.error(
        "❌ Webhook verification failed:",
        err.message
      );

      return res.status(400).send(
        `Webhook Error: ${err.message}`
      );
    }

    console.log(
      "🔥 Stripe Event:",
      event.type
    );

    /* =========================================
       CHECKOUT COMPLETE
    ========================================= */

    if (
      event.type ===
      "checkout.session.completed"
    ) {

      const session = event.data.object;

      const metadata =
        session.metadata || {};

      const type =
        metadata.type || "store";

      const userId =
        metadata.user_id || null;

      const creatorId =
        metadata.creator_id || null;

      const productId =
        metadata.product_id || null;

      const streamId =
        metadata.stream_id || null;

      const amount =
        session.amount_total || 0;

      const currency =
        session.currency || "usd";

      /* =========================================
         STORE PURCHASE
      ========================================= */

      if (type === "store") {

        console.log(
          "🛒 Store purchase completed"
        );

        await supabase
          .from("store_orders")
          .insert({
            stripe_session_id: session.id,

            stripe_payment_intent_id:
              session.payment_intent,

            stripe_customer_id:
              session.customer,

            product_id: productId,

            creator_id: creatorId,

            customer_email:
              session.customer_details?.email,

            amount_total: amount,

            currency,

            payment_status: "paid",

            order_status: "processing",

            metadata,

            created_at:
              new Date().toISOString(),
          });

        /* =========================================
           DIGITAL UNLOCK
        ========================================= */

        if (
          metadata.is_digital === "true"
        ) {

          await supabase
            .from("digital_unlocks")
            .insert({
              user_id: userId,
              product_id: productId,
              unlocked_at:
                new Date().toISOString(),
            });

        }

        /* =========================================
           SELLER BALANCE
        ========================================= */

        if (creatorId) {

          const sellerShare =
            Math.floor(amount * 0.90);

          const {
            data: existingBalance
          } = await supabase
            .from("creator_balances")
            .select("*")
            .eq(
              "user_id",
              creatorId
            )
            .single();

          if (existingBalance) {

            await supabase
              .from("creator_balances")
              .update({
                available_cents:
                  (
                    existingBalance.available_cents ||
                    0
                  ) + sellerShare,

                lifetime_earned_cents:
                  (
                    existingBalance
                      .lifetime_earned_cents ||
                    0
                  ) + sellerShare,
              })
              .eq(
                "user_id",
                creatorId
              );

          } else {

            await supabase
              .from("creator_balances")
              .insert({
                user_id: creatorId,

                available_cents:
                  sellerShare,

                lifetime_earned_cents:
                  sellerShare,
              });

          }

        }

      }

      /* =========================================
         LIVE VIP PURCHASE
      ========================================= */

      if (type === "live_vip") {

        console.log(
          "🎥 VIP live unlocked"
        );

        await supabase
          .from("live_stream_purchases")
          .insert({
            stream_id: streamId,

            user_id: userId,

            stripe_checkout_session_id:
              session.id,

            stripe_payment_intent_id:
              session.payment_intent,

            stripe_customer_id:
              session.customer,

            amount_cents: amount,

            currency,

            status: "paid",

            purchased_at:
              new Date().toISOString(),

            metadata,
          });

      }

      /* =========================================
         LIVE TIPS
      ========================================= */

      if (type === "live_tip") {

        console.log(
          "💸 Live tip received"
        );

        await supabase
          .from("live_tips")
          .insert({
            stream_id: streamId,

            from_user_id: userId,

            to_user_id: creatorId,

            amount_cents: amount,

            currency,

            stripe_payment_intent_id:
              session.payment_intent,

            stripe_checkout_session_id:
              session.id,

            created_at:
              new Date().toISOString(),
          });

      }

    }

    /* =========================================
       PAYMENT FAILED
    ========================================= */

    if (
      event.type ===
      "payment_intent.payment_failed"
    ) {

      console.log(
        "❌ Payment failed"
      );

    }

    /* =========================================
       SUCCESS
    ========================================= */

    return res.status(200).json({
      received: true
    });

  } catch (err) {

    console.error(
      "❌ Stripe webhook fatal error:",
      err
    );

    return res.status(500).json({
      error: err.message
    });

  }

}
