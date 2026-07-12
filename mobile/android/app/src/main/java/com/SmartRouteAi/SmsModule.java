package com.smartrouteai; // <-- replace with your actual applicationId from android/app/build.gradle

import android.telephony.SmsManager;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

// Sends an SMS directly via Android's SmsManager - no user interaction,
// no SMS app opening. This is what makes the SOS trigger silent/automatic
// rather than just pre-filling a message the user still has to tap Send on.
// Requires the SEND_SMS permission to be granted at runtime (see sos.ts).
public class SmsModule extends ReactContextBaseJavaModule {

    SmsModule(ReactApplicationContext context) {
        super(context);
    }

    @Override
    public String getName() {
        return "SmsModule";
    }

    @ReactMethod
    public void sendSms(String phoneNumber, String message, Promise promise) {
        try {
            SmsManager smsManager = SmsManager.getDefault();

            // SMS bodies over ~160 chars need to be split into multiple parts.
            if (message.length() > 150) {
                java.util.ArrayList<String> parts = smsManager.divideMessage(message);
                smsManager.sendMultipartTextMessage(phoneNumber, null, parts, null, null);
            } else {
                smsManager.sendTextMessage(phoneNumber, null, message, null, null);
            }

            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("SMS_SEND_FAILED", e.getMessage(), e);
        }
    }
}
