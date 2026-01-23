/**
 * Configuración centralizada de la Landing Page
 * Actualiza estos valores para personalizar tu landing page
 */

export const landingConfig = {
  // Información de contacto
  contact: {
    whatsapp: {
      // Número de WhatsApp (formato: código país + número, sin + ni espacios)
      phoneNumber: '573174503604',
      defaultMessage: 'Hola, me gustaría saber más sobre el sistema POS',
    },
    calendly: {
      // URL de tu cuenta de Calendly para agendar demos
      url: 'https://calendly.com/julii1295/30min',
    },
    email: 'admin@neurai.dev',
    // Chat en vivo Tawk.to
    tawkTo: {
      propertyId: '6972efa923ac1a197c06ce90',
      widgetId: '1jfkfgbso',
    },
  },

  // Nombre de la marca
  brand: {
    name: 'Posib.dev',
    tagline: 'Sistema POS con Cumplimiento DIAN',
    description: 'Gestión profesional para tu negocio con facturación electrónica certificada',
  },

  // Configuración de planes con precios y límites
  pricing: {
    basic: {
      price: 24900,
      maxProducts: 100,
      maxUsers: 1,
      features: {
        pos: true,
        inventory: true,
        reports: 'basic',
        onlineStore: false,
        dianInvoicing: false,
        loyaltyPoints: false,
        suppliers: false,
        analytics: false,
        emailMarketing: false,
      },
    },
    professional: {
      price: 39800,
      maxProducts: 200,
      maxUsers: 5,
      features: {
        pos: true,
        inventory: true,
        reports: 'advanced',
        onlineStore: true,
        dianInvoicing: true,
        loyaltyPoints: true,
        suppliers: true,
        analytics: false,
        emailMarketing: false,
      },
    },
    //   premium: {
    //     price: 79900,
    //     maxProducts: 500,
    //     maxUsers: 10,
    //     features: {
    //       pos: true,
    //       inventory: true,
    //       reports: 'advanced',
    //       onlineStore: true,
    //       dianInvoicing: true,
    //       loyaltyPoints: true,
    //       suppliers: true,
    //       analytics: true,
    //       emailMarketing: true,
    //     },
    //   },
    //   enterprise: {
    //     price: 'custom',
    //     maxProducts: -1, // ilimitado
    //     maxUsers: -1,    // ilimitado
    //     features: {
    //       pos: true,
    //       inventory: true,
    //       reports: 'custom',
    //       onlineStore: true,
    //       dianInvoicing: true,
    //       loyaltyPoints: true,
    //       suppliers: true,
    //       analytics: true,
    //       emailMarketing: true,
    //       multiLocation: true,
    //       customApi: true,
    //       dedicatedSupport: true,
    //     },
    //   },
    // },

    // Social proof - Actualiza con datos reales
    stats: {
      satisfaction: '98%',
      rating: '4.9/5',
      dianCompliance: '100%',
    },

    // Feature flags - Activa/desactiva secciones
    features: {
      showWhatsAppButton: true,
      showDemoButton: true,
      showPricingPlans: true,
      showDianCompliance: true,
      showDianGuarantee: true,
      showFreeMigration: true,
      showTrustBadges: true,
      showVideoTutorials: true,
      showResistanceSection: true,
    },

    // URLs de videos (actualiza cuando subas tus videos)
    videos: {
      posDemo: '/videos/pos-demo.mp4',
      inventoryDemo: '/videos/inventory-demo.mp4',
      storeDemo: '/videos/store-demo.mp4',
      migrationTutorial: '/videos/migration-tutorial.mp4',
    },

    // Legal - IMPORTANTE: Verifica estos valores anualmente
    dian: {
      uvt: {
        year: 2025,
        // Valores UVT para declaración de renta (actualiza cada año)
        patrimonioMinimo: '4.500 UVT (≈$214 millones COP)',
        ingresosMinimos: '1.400 UVT (≈$66 millones COP)',
      },
    },
  }
};

export default landingConfig;
