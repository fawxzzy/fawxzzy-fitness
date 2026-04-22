import { PASSWORD_LOGIN_UI_COPY } from "@/components/auth/authCopy";

export function shouldStartCredentialStepOpenForLogin(args: { error?: string; requiresReauth?: boolean }) {
  return Boolean(args.requiresReauth || args.error);
}

export function getRememberedAccountPromptState(args: {
  hasRememberedAccount: boolean;
  showCredentialStep: boolean;
}) {
  if (!args.hasRememberedAccount || args.showCredentialStep) {
    return null;
  }

  return {
    action: "reveal-credentials" as const,
    label: PASSWORD_LOGIN_UI_COPY.cta.continue,
  };
}

export function getLoginSubmitLabel(args: {
  formReady: boolean;
  isReauthFlow: boolean;
  isSubmitting: boolean;
}) {
  if (args.isSubmitting) {
    return PASSWORD_LOGIN_UI_COPY.cta.pending;
  }

  if (args.isReauthFlow) {
    return PASSWORD_LOGIN_UI_COPY.cta.reauth;
  }

  if (args.formReady) {
    return PASSWORD_LOGIN_UI_COPY.cta.ready;
  }

  return PASSWORD_LOGIN_UI_COPY.cta.idle;
}
