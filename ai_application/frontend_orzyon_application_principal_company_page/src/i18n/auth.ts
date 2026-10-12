import type { Idioma } from './idiomas';

interface AuthCopy {
  shell: {
    backHome: string;
    ecosystemLabel: string;
    ecosystemTitle: string;
    ecosystemDescription: string;
    features: readonly string[];
    securityNote: string;
  };
  fields: {
    name: string;
    email: string;
    password: string;
    passwordConfirmation: string;
    showPassword: string;
    hidePassword: string;
  };
  login: {
    eyebrow: string;
    title: string;
    description: string;
    submit: string;
    submitting: string;
    redirecting: string;
    forgotPassword: string;
    noAccount: string;
    createAccount: string;
  };
  register: {
    eyebrow: string;
    title: string;
    description: string;
    submit: string;
    submitting: string;
    hasAccount: string;
    signIn: string;
    passwordHint: string;
    successTitle: string;
    successDescription: string;
  };
  forgot: {
    eyebrow: string;
    title: string;
    description: string;
    submit: string;
    submitting: string;
    backToLogin: string;
    successTitle: string;
    successDescription: string;
  };
  errors: {
    invalidCredentials: string;
    invalidRegistration: string;
    rateLimited: string;
    unavailable: string;
    passwordMismatch: string;
  };
}

export const AUTH_COPY: Record<Idioma, AuthCopy> = {
  pt: {
    shell: {
      backHome: 'Voltar ao portal',
      ecosystemLabel: 'UM ACESSO. TODO O ECOSSISTEMA.',
      ecosystemTitle: 'Sua operação ORZYON começa aqui.',
      ecosystemDescription:
        'Depois de entrar, você continua para o ambiente unificado de contratação, consumo e gestão dos produtos ORZYON.',
      features: ['Produtos e consultoria', 'Tokens e consumo', 'Cotações e pagamentos', 'Integrações e ambientes'],
      securityNote: 'Conexão segura · o portal não persiste suas credenciais.',
    },
    fields: {
      name: 'Nome completo',
      email: 'E-mail profissional',
      password: 'Senha',
      passwordConfirmation: 'Confirmar senha',
      showPassword: 'Mostrar senha',
      hidePassword: 'Ocultar senha',
    },
    login: {
      eyebrow: 'ACESSO À PLATAFORMA',
      title: 'Entre no ecossistema ORZYON.',
      description: 'Use sua conta para continuar com segurança para a plataforma.',
      submit: 'Entrar',
      submitting: 'Verificando acesso…',
      redirecting: 'Acesso confirmado. Abrindo a plataforma…',
      forgotPassword: 'Esqueci minha senha',
      noAccount: 'Ainda não tem uma conta?',
      createAccount: 'Criar cadastro',
    },
    register: {
      eyebrow: 'NOVO CADASTRO',
      title: 'Crie sua conta ORZYON.',
      description: 'Comece pelo portal e acesse produtos, consultoria e serviços em um único ambiente.',
      submit: 'Criar conta',
      submitting: 'Criando sua conta…',
      hasAccount: 'Já tem uma conta?',
      signIn: 'Entrar',
      passwordHint: 'Use pelo menos 10 caracteres.',
      successTitle: 'Cadastro recebido.',
      successDescription: 'Enviamos as próximas instruções para o seu e-mail. Verifique também a pasta de spam.',
    },
    forgot: {
      eyebrow: 'RECUPERAÇÃO DE ACESSO',
      title: 'Vamos recuperar sua senha.',
      description: 'Informe seu e-mail. Se houver uma conta associada, enviaremos as instruções de recuperação.',
      submit: 'Enviar instruções',
      submitting: 'Enviando…',
      backToLogin: 'Voltar para entrar',
      successTitle: 'Verifique seu e-mail.',
      successDescription: 'Se esse endereço estiver cadastrado, as instruções de recuperação chegarão em instantes.',
    },
    errors: {
      invalidCredentials: 'Não foi possível entrar com essas credenciais. Revise os dados e tente novamente.',
      invalidRegistration: 'Revise os dados do cadastro e tente novamente.',
      rateLimited: 'Muitas tentativas em pouco tempo. Aguarde alguns minutos antes de tentar novamente.',
      unavailable: 'O acesso está temporariamente indisponível. Tente novamente em alguns instantes.',
      passwordMismatch: 'As senhas informadas não são iguais.',
    },
  },
  en: {
    shell: {
      backHome: 'Back to portal',
      ecosystemLabel: 'ONE ACCESS. THE ENTIRE ECOSYSTEM.',
      ecosystemTitle: 'Your ORZYON operation starts here.',
      ecosystemDescription:
        'After signing in, you continue to the unified environment for contracting, usage and management of ORZYON products.',
      features: ['Products and consulting', 'Tokens and usage', 'Quotes and payments', 'Integrations and environments'],
      securityNote: 'Secure connection · the portal does not persist your credentials.',
    },
    fields: {
      name: 'Full name',
      email: 'Work email',
      password: 'Password',
      passwordConfirmation: 'Confirm password',
      showPassword: 'Show password',
      hidePassword: 'Hide password',
    },
    login: {
      eyebrow: 'PLATFORM ACCESS',
      title: 'Enter the ORZYON ecosystem.',
      description: 'Use your account to continue securely to the platform.',
      submit: 'Sign in',
      submitting: 'Verifying access…',
      redirecting: 'Access confirmed. Opening the platform…',
      forgotPassword: 'Forgot my password',
      noAccount: 'Do not have an account yet?',
      createAccount: 'Create account',
    },
    register: {
      eyebrow: 'NEW ACCOUNT',
      title: 'Create your ORZYON account.',
      description: 'Start at the portal and access products, consulting and services in one environment.',
      submit: 'Create account',
      submitting: 'Creating your account…',
      hasAccount: 'Already have an account?',
      signIn: 'Sign in',
      passwordHint: 'Use at least 10 characters.',
      successTitle: 'Registration received.',
      successDescription: 'We sent the next steps to your email. Please check your spam folder as well.',
    },
    forgot: {
      eyebrow: 'ACCESS RECOVERY',
      title: 'Let’s recover your password.',
      description: 'Enter your email. If an account is associated with it, we will send recovery instructions.',
      submit: 'Send instructions',
      submitting: 'Sending…',
      backToLogin: 'Back to sign in',
      successTitle: 'Check your email.',
      successDescription: 'If this address is registered, recovery instructions will arrive shortly.',
    },
    errors: {
      invalidCredentials: 'We could not sign you in with those credentials. Review the details and try again.',
      invalidRegistration: 'Review the registration details and try again.',
      rateLimited: 'Too many attempts in a short period. Wait a few minutes before trying again.',
      unavailable: 'Access is temporarily unavailable. Please try again in a few moments.',
      passwordMismatch: 'The passwords do not match.',
    },
  },
  es: {
    shell: {
      backHome: 'Volver al portal',
      ecosystemLabel: 'UN ACCESO. TODO EL ECOSISTEMA.',
      ecosystemTitle: 'Su operación ORZYON comienza aquí.',
      ecosystemDescription:
        'Después de iniciar sesión, continúa al entorno unificado de contratación, consumo y gestión de productos ORZYON.',
      features: ['Productos y consultoría', 'Tokens y consumo', 'Cotizaciones y pagos', 'Integraciones y entornos'],
      securityNote: 'Conexión segura · el portal no conserva sus credenciales.',
    },
    fields: {
      name: 'Nombre completo',
      email: 'Correo profesional',
      password: 'Contraseña',
      passwordConfirmation: 'Confirmar contraseña',
      showPassword: 'Mostrar contraseña',
      hidePassword: 'Ocultar contraseña',
    },
    login: {
      eyebrow: 'ACCESO A LA PLATAFORMA',
      title: 'Entre al ecosistema ORZYON.',
      description: 'Use su cuenta para continuar de forma segura a la plataforma.',
      submit: 'Iniciar sesión',
      submitting: 'Verificando acceso…',
      redirecting: 'Acceso confirmado. Abriendo la plataforma…',
      forgotPassword: 'Olvidé mi contraseña',
      noAccount: '¿Aún no tiene una cuenta?',
      createAccount: 'Crear cuenta',
    },
    register: {
      eyebrow: 'NUEVO REGISTRO',
      title: 'Cree su cuenta ORZYON.',
      description: 'Comience en el portal y acceda a productos, consultoría y servicios en un solo entorno.',
      submit: 'Crear cuenta',
      submitting: 'Creando su cuenta…',
      hasAccount: '¿Ya tiene una cuenta?',
      signIn: 'Iniciar sesión',
      passwordHint: 'Use al menos 10 caracteres.',
      successTitle: 'Registro recibido.',
      successDescription: 'Enviamos los próximos pasos a su correo. Revise también la carpeta de spam.',
    },
    forgot: {
      eyebrow: 'RECUPERACIÓN DE ACCESO',
      title: 'Vamos a recuperar su contraseña.',
      description: 'Informe su correo. Si hay una cuenta asociada, enviaremos las instrucciones de recuperación.',
      submit: 'Enviar instrucciones',
      submitting: 'Enviando…',
      backToLogin: 'Volver a iniciar sesión',
      successTitle: 'Revise su correo.',
      successDescription: 'Si esta dirección está registrada, las instrucciones llegarán en breve.',
    },
    errors: {
      invalidCredentials: 'No fue posible iniciar sesión con esas credenciales. Revise los datos e inténtelo de nuevo.',
      invalidRegistration: 'Revise los datos del registro e inténtelo de nuevo.',
      rateLimited: 'Demasiados intentos en poco tiempo. Espere unos minutos antes de volver a intentarlo.',
      unavailable: 'El acceso no está disponible temporalmente. Inténtelo de nuevo en unos instantes.',
      passwordMismatch: 'Las contraseñas no coinciden.',
    },
  },
};
