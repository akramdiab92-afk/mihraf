export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // الصفحة الرئيسية
    if (url.pathname === "/" && request.method === "GET") {
      return json({
        success: true,
        message: "Test Resend Worker يعمل بشكل صحيح.",
        test_url: "/api/test-resend"
      });
    }

    // اختبار Resend
    if (
      url.pathname === "/api/test-resend" &&
      request.method === "GET"
    ) {
      return await testResend(env);
    }

    return json(
      {
        success: false,
        error: "المسار غير موجود."
      },
      404
    );
  }
};


// ========================================
// اختبار اتصال Resend ومفتاح API
// ========================================

async function testResend(env) {
  try {

    // التأكد فقط من وجود المفتاح
    // بدون إظهار قيمته نهائيا
    if (!env.RESEND_API_KEY) {

      return json(
        {
          success: false,

          key_configured: false,

          error:
            "RESEND_API_KEY غير موجود في إعدادات هذا الـWorker.",

          solution:
            "أضف Secret باسم RESEND_API_KEY إلى هذا الـWorker."
        },
        500
      );

    }


    // اختبار المفتاح عن طريق API الخاص بـ Resend
    // هذا الطلب لا يرسل أي بريد
    const response = await fetch(
      "https://api.resend.com/domains",
      {
        method: "GET",

        headers: {
          "Authorization":
            `Bearer ${env.RESEND_API_KEY}`,

          "Accept":
            "application/json"
        }
      }
    );


    const responseText =
      await response.text();


    // محاولة قراءة JSON
    let responseData = null;

    try {
      responseData =
        JSON.parse(responseText);
    } catch {
      responseData = null;
    }


    // المفتاح يعمل
    if (response.ok) {

      let domainsCount = null;

      if (
        responseData &&
        Array.isArray(responseData.data)
      ) {
        domainsCount =
          responseData.data.length;
      }

      return json({
        success: true,

        key_configured: true,

        resend_status:
          response.status,

        resend_connection:
          "نجح الاتصال بـ Resend",

        api_key:
          "المفتاح موجود ويقبله Resend",

        domains_count:
          domainsCount,

        message:
          "Resend يعمل بشكل صحيح مع هذا الـWorker."
      });

    }


    // المفتاح موجود لكن Resend رفضه
    return json(
      {
        success: false,

        key_configured: true,

        resend_status:
          response.status,

        resend_connection:
          "تم الاتصال بـ Resend",

        api_key:
          "المفتاح موجود لكن Resend رفض الطلب",

        resend_response:
          responseData || responseText,

        message:
          "المشكلة في مفتاح Resend أو صلاحياته."
      },
      response.status
    );


  } catch (error) {

    return json(
      {
        success: false,

        key_configured:
          Boolean(env.RESEND_API_KEY),

        error:
          "تعذر الاتصال بـ Resend.",

        details:
          error?.message ||
          String(error)
      },
      500
    );

  }
}


// ========================================
// JSON Response
// ========================================

function json(data, status = 200) {

  return new Response(
    JSON.stringify(
      data,
      null,
      2
    ),
    {
      status,

      headers: {
        "Content-Type":
          "application/json; charset=UTF-8",

        "Cache-Control":
          "no-store"
      }
    }
  );

}
