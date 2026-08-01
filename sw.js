// sw.js — Service Worker do Agenda PRO
// Só existe pra hospedar o worker do OneSignal (quem cuida de verdade da
// entrega das notificações push). Se um dia você tirar o OneSignal, dá
// pra apagar este arquivo e a chamada de registro no HTML — não afeta
// nada mais do app.
importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDKWorker.js");
