import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      productId,
      buyerId,
      quantity = 1
    } = req.body || {};

    if (!productId || !buyerId) {
      return res.status(400).json({
        error: "Missing productId or buyerId"
      });
    }

    const appUrl =
      process.env.APP_URL || "https://rich-bizness-mobile-five.vercel.app";

    const { data: product, error: productError } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .single();

    if (productError || !product) {
      return res.status(404).json({
        error: "Product not found"
      });
    }

    if (product.status !== "active") {
      return res.status(400).json({
        error: "Product is not active"
      });
    }

    const qty = Math.max(Number(quantity || 1), 1);
    const amountTotal = Number(product.price_cents || 0) * qty;
    const platformFee = Math.round(amountTotal * 0.1);
    const sellerAmount = Math.max(amountTotal - platformFee, 0);

    const { data: order, error: orderError } = await supabase
      .from("store_orders")
      .insert({
        buyer_id: buyerId,
        seller_id: product.seller_id,
        product_id: product.id,
        product_name: product.title,
        quantity: qty,
        amount_total: amountTotal,
        platform_fee_cents: platformFee,
        seller_amount_cents: sellerAmount,
        currency: product.currency || "usd",
        payment_status: "pending",
        order_status: "pending",
        fulfillment_type: product.fulfillment_type || "shipping",
        metadata: {
          source: "stripe_checkout",
          product_type: product.product_type,
          is_digital: product.is_digital
        }
      })
      .select("*")
      .single();

    if (orderError || !order) {
      return res.status(500).json({
        error: orderError?.message || "Order create failed"
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${appUrl}/store.html?checkout=success&order=${order.id}`,
      cancel_url: `${appUrl}/store.html?checkout=cancelled&order=${order.id}`,
      line_items: [
        {
          quantity: qty,
          price_data: {
            currency: product.currency || "usd",
            unit_amount: Number(product.price_cents || 0),
            product_data: {
              name: product.title,
              description: product.description || "Rich Bizness marketplace product",
              images: product.image_url ? [product.image_url] : []
            }
          }
        }
      ],
      metadata: {
        type: "store_order",
        order_id: order.id,
        product_id: product.id,
        buyer_id: buyerId,
        seller_id: product.seller_id || "",
        seller_amount_cents: String(sellerAmount),
        platform_fee_cents: String(platformFee),
        is_digital: String(!!product.is_digital)
      }
    });

    await supabase
      .from("store_orders")
      .update({
        stripe_checkout_session_id: session.id
      })
      .eq("id", order.id);

    return res.status(200).json({
      url: session.url,
      sessionId: session.id,
      orderId: order.id
    });
  } catch (error) {
    console.error("Store checkout error:", error);

    return res.status(500).json({
      error: error.message || "Checkout failed"
    });
  }
}
