"use client";
import { I18nProvider, useI18n } from "@/lib/i18n";
import { ToastProvider } from "./ui";
import ErrorBoundary from "./ErrorBoundary";

/** Xato ekranidagi matnlar ham tarjima qilinadi */
function Boundary({ children }) {
  const { t } = useI18n();
  return (
    <ErrorBoundary
      title={t("common.somethingWrong")}
      text={t("common.somethingWrongText")}
      retry={t("common.retry")}
    >
      {children}
    </ErrorBoundary>
  );
}

export default function Providers({ children }) {
  return (
    <I18nProvider>
      <ToastProvider>
        <Boundary>{children}</Boundary>
      </ToastProvider>
    </I18nProvider>
  );
}
