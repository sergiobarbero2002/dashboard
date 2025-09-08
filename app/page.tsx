'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { CheckCircle, Eye, EyeOff, Mail, Lock, ArrowRight, Sparkles, Zap, Shield, TrendingUp, Menu, X, Star, Award, Users, Building2 } from 'lucide-react';
import Image from 'next/image';
import { useSound } from '@/hooks/useSound';
import { useToast } from '@/hooks/useToast';
import { useSupabase } from '@/components/providers/SupabaseProvider';
import { ParticlesBackground } from '@/components/ui/ParticlesBackground';
import './animations.css';

export default function MainPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [animationTrigger, setAnimationTrigger] = useState(0);
  const [showDemoNotification, setShowDemoNotification] = useState(false);
  const [showDesktopRecommendation, setShowDesktopRecommendation] = useState(false);
  
  const router = useRouter();
  const { playClick } = useSound();
  const { showSuccess, showError } = useToast();
  const { signInWithPassword } = useSupabase();

  // Animación de entrada
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Forzar animación al cargar la página
  useEffect(() => {
    setAnimationTrigger(prev => prev + 1);
  }, []);

  // Ocultar notificación de demo después de 3 segundos
  useEffect(() => {
    if (showDemoNotification) {
      const timer = setTimeout(() => {
        setShowDemoNotification(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showDemoNotification]);

  // Detectar si es móvil y mostrar recomendación
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setShowDesktopRecommendation(isMobileDevice);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    playClick();

    try {
      const { error } = await signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
        showError('Error al iniciar sesión');
        } else {
        setSuccess(true);
        showSuccess('¡Sesión iniciada correctamente!');
        setTimeout(() => router.push('/dashboard'), 1500);
      }
    } catch (err) {
      setError('Error inesperado');
      showError('Error inesperado');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    setIsDemo(true);
    setError('');
    setShowDemoNotification(true);
    playClick();

    try {
      console.log('🔍 Debug Demo Login:');
      console.log('📧 Email:', 'demo@smarthotels.es');
      console.log('🔑 Password:', 'demo123456');
      
      // Verificar que las variables de entorno estén configuradas
      if (!process.env.NEXT_PUBLIC_SUPABASE_AUTH_URL || !process.env.NEXT_PUBLIC_SUPABASE_AUTH_ANON_KEY) {
        const errorMsg = 'Variables de entorno de Supabase no configuradas';
        console.error('❌', errorMsg);
        setError(errorMsg);
        showError(errorMsg);
        return;
      }

      console.log('🚀 Intentando autenticación...');
      
      // Usar las credenciales de demo correctas según la configuración
      const result = await signInWithPassword({ 
        email: 'demo@smarthotels.es', 
        password: 'demo123' 
      });
      
      console.log('📊 Resultado de autenticación:', result);
      
      if (result.error) {
        console.error('❌ Error de autenticación:', result.error);
        
        // Manejar diferentes tipos de errores
        let errorMsg = 'Error al iniciar demo';
        if (result.error.message.includes('Invalid login credentials')) {
          errorMsg = '❌ Usuario demo no encontrado. El usuario demo@smarthotels.es no está registrado en Supabase. Contacta al administrador para crear el usuario demo.';
        } else if (result.error.message.includes('Email not confirmed')) {
          errorMsg = 'El email demo@smarthotels.es no está confirmado. Verifica tu correo.';
        } else if (result.error.message.includes('Too many requests')) {
          errorMsg = 'Demasiados intentos. Espera un momento antes de intentar de nuevo.';
        } else {
          errorMsg = `Error al iniciar demo: ${result.error.message}`;
        }
        
        setError(errorMsg);
        showError(errorMsg);
        return;
      }
      
      console.log('✅ Autenticación exitosa:', result.data);
      setSuccess(true);
      showSuccess('¡Demo iniciada! Redirigiendo al dashboard...');
      setTimeout(() => router.push('/dashboard'), 1500);
    } catch (err) {
      console.error('❌ Error inesperado:', err);
      const errorMsg = `Error inesperado: ${err instanceof Error ? err.message : 'Error desconocido'}`;
      setError(errorMsg);
      showError(errorMsg);
    } finally {
      setLoading(false);
      setIsDemo(false);
    }
  };

  const handleInputClick = () => {
    playClick();
  };

  const toggleLogin = () => {
    setShowLogin(!showLogin);
    playClick();
  };

  return (
    <div className="main-page min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50 relative overflow-hidden">
      {/* Fondo de partículas doradas mejorado */}
      <div className="fixed inset-0 w-full h-full pointer-events-none z-0">
      <ParticlesBackground />
        <div className="absolute inset-0 bg-gradient-to-br from-amber-50/30 via-transparent to-amber-100/20" />
      </div>
      
      {/* Overlay de gradiente sutil */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-amber-100/30" />
      
      {/* Header fijo con navegación */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-amber-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-4">
              <div className="relative group/header-logo">
                {/* Círculo dorado con gradiente premium */}
                <div className="w-10 h-10 bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 rounded-full flex items-center justify-center shadow-lg group-hover/header-logo:shadow-xl transition-all duration-300 group-hover/header-logo:scale-110 relative overflow-hidden border-2 border-amber-300/50">
                  {/* Efecto de brillo interno */}
                  <div className="absolute inset-1 bg-gradient-to-br from-white/20 to-transparent rounded-full" />
                  
                  {/* Logo */}
                  <div className="relative z-10 w-6 h-6 flex items-center justify-center">

                    <Image
                      src="/assets/images/smarthotels-logo.png"
                      alt="SmartHotels Logo"
                      width={24}
                      height={24}
                      className="w-6 h-6 object-contain filter drop-shadow-sm scale-150"
                      priority
                    />
                  </div>
                  
                  {/* Efecto de brillo deslizante en hover */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover/header-logo:translate-x-full transition-transform duration-500 rounded-full" />
                </div>
                
                {/* Anillo decorativo */}
                <div className="absolute -inset-1 border border-amber-300/40 rounded-full animate-gentle-pulse" />
      </div>
              <span className="text-xl font-bold relative">
                <span className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 bg-clip-text text-transparent relative z-10">
                  SmartHotels
                </span>
                {/* Efecto de brillo sutil */}
                <span className="absolute inset-0 bg-gradient-to-r from-amber-400/10 via-amber-500/15 to-amber-400/10 bg-clip-text text-transparent blur-sm">
                  SmartHotels
                </span>
              </span>
            </div>

            {/* Navegación desktop */}
            <nav className="hidden md:flex space-x-8">
              <a href="#features" className="text-slate-600 hover:text-amber-600 transition-colors">Características</a>
              <a href="#about" className="text-slate-600 hover:text-amber-600 transition-colors">Contacto</a>
            </nav>

            {/* Botones de acción */}
            <div className="flex items-center space-x-2">
              {/* Botón Demo - Siempre visible en móvil */}
              <Button
                onClick={handleDemoLogin}
                className="bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-white font-semibold relative overflow-hidden group text-sm px-3 py-2"
                disabled={loading}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500" />
                <Zap className="w-4 h-4 mr-1 animate-pulse" />
                <span className="relative z-10 hidden sm:inline">Prueba nuestra demo</span>
                <span className="relative z-10 sm:hidden">Demo</span>
              </Button>

              {/* Botón Iniciar Sesión - Solo visible en desktop */}
              <Button
                onClick={toggleLogin}
                variant="outline"
                className="hidden md:flex border-amber-200 text-amber-700 hover:bg-amber-50"
              >
                Iniciar Sesión
              </Button>

              {/* Menú móvil */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-slate-100"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Menú móvil */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white/95 backdrop-blur-xl border-t border-amber-200/50">
            <div className="px-4 py-4 space-y-4">
              <a 
                href="#features" 
                className="block text-slate-600 hover:text-amber-600 transition-colors py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Características
              </a>
              <a 
                href="#about" 
                className="block text-slate-600 hover:text-amber-600 transition-colors py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Contacto
              </a>
              
              <div className="pt-2 border-t border-slate-200">
                <Button
                  onClick={() => {
                    toggleLogin();
                    setMobileMenuOpen(false);
                  }}
                  variant="outline"
                  className="w-full border-amber-200 text-amber-700 hover:bg-amber-50 mb-3"
                >
                  <Lock className="w-4 h-4 mr-2" />
                  Iniciar Sesión
                </Button>
                <Button
                  onClick={() => {
                    handleDemoLogin();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-white font-semibold relative overflow-hidden group"
                  disabled={loading}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500" />
                  <Zap className="w-4 h-4 mr-2 animate-pulse" />
                  <span className="relative z-10">Probar Demo Ahora</span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Notificación de Demo */}
      {showDemoNotification && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-slide-down">
          <div className="bg-gradient-to-r from-amber-400 to-amber-600 text-white px-6 py-4 rounded-2xl shadow-2xl border border-amber-300/50 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <Zap className="w-4 h-4 animate-pulse" />
              </div>
              <div>
                <p className="font-semibold text-sm">🚀 Iniciando Demo...</p>
                <p className="text-xs text-amber-100">Preparando tu experiencia personalizada</p>
              </div>
              <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
            </div>
          </div>
        </div>
      )}

      {/* Aviso de recomendación móvil */}
      {showDesktopRecommendation && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-b border-amber-200/50 py-3 px-4 shadow-lg">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 rounded-full flex items-center justify-center shadow-lg">
                <Building2 className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="font-semibold text-sm text-slate-800">💻 Recomendación</p>
                <p className="text-xs text-slate-600">Para una mejor experiencia, te recomendamos usar el modo escritorio en tu navegador</p>
              </div>
            </div>
            <button
              onClick={() => setShowDesktopRecommendation(false)}
              className="text-slate-600 hover:text-amber-600 transition-colors p-1 rounded-lg hover:bg-amber-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Contenido principal */}
      <main className={`relative z-10 ${showDesktopRecommendation ? 'pt-24' : 'pt-16'}`}>
        
        {/* Hero Section - Imágenes prominentes */}
        <section className="min-h-screen flex items-center justify-center px-4 py-20">
          <div className="max-w-7xl mx-auto w-full">
            
            {/* Título principal con diseño de experto senior */}
            <div className="text-center mb-16 relative">
              {/* Logo y título integrados profesionalmente */}
              <div 
                key={animationTrigger}
                className="relative inline-flex items-center gap-8 mb-12 group" 
              >
                {/* Logo circular dorado con integración perfecta */}
                <div className="relative group/logo animate-logo-professional-entrance">
                  {/* Círculo dorado con gradiente premium y borde más ancho */}
                  <div className="w-48 h-48 bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 rounded-full flex items-center justify-center shadow-2xl relative overflow-hidden border-4 border-amber-300/60">
                    {/* Efecto de brillo interno */}
                    <div className="absolute inset-3 bg-gradient-to-br from-white/20 to-transparent rounded-full" />
                    
                    {/* Logo con más zoom */}
                    <div className="relative z-10 w-40 h-40 flex items-center justify-center">
                                      <Image
                  src="/assets/images/smarthotels-logo.png"
                  alt="SmartHotels Logo"
                  width={100}
                  height={100}
                  className="w-40 h-40 object-contain filter drop-shadow-lg scale-125"
                  priority
                  onError={(e) => {
                    console.log('Error loading main logo:', e);
                    e.currentTarget.style.display = 'none';
                  }}
                />
                    </div>
                    
                  </div>
                  
                  {/* Anillo decorativo con borde más ancho */}
                  <div className="absolute -inset-2 border-4 border-amber-300/60 rounded-full animate-gentle-pulse" />
                </div>
                
                {/* Título con tipografía de experto */}
                <div className="text-left animate-title-professional-entrance" style={{ animationDelay: '0.3s' }}>
                  <h1 className="text-6xl md:text-7xl lg:text-8xl font-black leading-none mb-4 relative">
                    <span className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-clip-text text-transparent relative z-10">
                      SmartHotels
                    </span>
                    {/* Efecto de sombra dorada */}
                    <span className="absolute inset-0 bg-gradient-to-r from-amber-400/20 via-amber-500/30 to-amber-400/20 bg-clip-text text-transparent blur-sm">
                      SmartHotels
                    </span>
                    {/* Efecto de brillo superior */}
                    <div className="absolute -top-2 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent opacity-60"></div>
                  </h1>
                  
                  {/* Subtítulo elegante */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className="h-0.5 w-16 bg-gradient-to-r from-amber-400 to-amber-600 rounded-full" />
                    <span className="text-amber-600 font-semibold text-lg tracking-widest uppercase">
                    Emails y Seguimientos automáticos para hoteles
                    </span>
                  </div>
                </div>
              </div>

            </div>

            {/* Grid de imágenes prominentes */}
            <div className="grid lg:grid-cols-[1fr_1.15fr] gap-8 items-stretch mb-20">
              
              {/* Imagen izquierda - Email AI */}
              <div className="animate-slide-in-left h-full">
                <div className="relative group h-full">
                  <div className="absolute -inset-6 bg-gradient-to-r from-amber-400/20 to-amber-600/20 rounded-3xl blur-2xl group-hover:blur-3xl transition-all duration-500" />
                  <div className="relative bg-white/90 backdrop-blur-xl rounded-3xl px-4 py-8 shadow-2xl border border-amber-200/50 h-full flex flex-col">
                    <div className="text-center mb-6">
                      <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-amber-100 to-amber-200 rounded-full text-amber-800 text-lg font-semibold mb-4">
                        <Mail className="w-5 h-5" />
                </div>
                      <h3 className="text-2xl md:text-3xl font-bold text-slate-800 mb-3">
                        Emails y Seguimientos Automáticos
                    </h3>
                      <p className="text-slate-600 text-lg leading-relaxed mb-4">
                        Ahorra tiempo y dinero. Respuestas profesionales en segundos.
                      </p>
                    </div>
                    <div className="relative flex-1 rounded-2xl overflow-hidden shadow-xl min-h-[1400px]">
                      <Image
                        src="/assets/images/email.png"
                        alt="Email AI Dashboard"
                        fill
                        className="object-contain object-center scale-110"
                        priority
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Imagen derecha - Dashboard */}
              <div className="animate-slide-in-right h-full">
                <div className="relative group h-full">
                  <div className="absolute -inset-6 bg-gradient-to-r from-amber-400/20 to-amber-600/20 rounded-3xl blur-2xl group-hover:blur-3xl transition-all duration-500" />
                  <div className="relative bg-white/90 backdrop-blur-xl rounded-3xl px-4 py-8 shadow-2xl border border-amber-200/50 h-full flex flex-col">
                    <div className="text-center mb-6">
                      <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-amber-100 to-amber-200 rounded-full text-amber-800 text-lg font-semibold mb-4">
                        <TrendingUp className="w-5 h-5" />
                      </div>
                      <h3 className="text-2xl md:text-3xl font-bold text-slate-800 mb-3">
                        Dashboard en Tiempo Real
                      </h3>
                      <p className="text-slate-600 text-lg leading-relaxed mb-4">
                      Toma mejores decisiones. Controla todo al instante.
                      </p>
                      {/* Indicador de Demo */}
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-100 to-emerald-100 rounded-full text-green-800 text-sm font-semibold border border-green-200">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        ¡Puedes probarlo ahora mismo en la demo!
                      </div>
                    </div>
                    <div className="relative flex-1 rounded-2xl overflow-hidden shadow-xl min-h-[1400px]">
                      <Image
                        src="/assets/images/dashboard.png"
                        alt="Dashboard Web"
                        fill
                        className="object-cover object-center"
                        priority
                      />
                    </div>
                </div>
                </div>
              </div>
            </div>

            {/* CTA Principal - Demo Destacada */}
            <div className="text-center animate-fade-in-up">
              {/* Indicador de Demo */}
              <div className="mb-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-100 to-emerald-100 rounded-full text-green-800 text-sm font-semibold border border-green-200">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  ¡Puedes probar la demo haciendo click!
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Button
                  onClick={handleDemoLogin}
                  size="lg"
                  className="bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-white px-10 py-5 text-xl font-bold rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-110 relative overflow-hidden group"
                  disabled={loading}
                >
                  {/* Efecto de brillo deslizante */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  
                  <Zap className="w-6 h-6 mr-3 animate-pulse" />
                  <span className="relative z-10">Probar Demo Ahora</span>
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-bounce"></div>
                </Button>
                <Button
                  onClick={toggleLogin}
                  variant="outline"
                  size="lg"
                  className="border-2 border-amber-200 text-amber-700 hover:bg-amber-50 hover:border-amber-300 px-8 py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                >
                  <Lock className="w-5 h-5 mr-2" />
                  Inicia Sesión
                </Button>
              </div>
              
              
              {/* Texto explicativo */}
              <p className="mt-4 text-slate-600 text-sm max-w-md mx-auto">
                Sin registro, sin compromiso. Accede instantáneamente a todas las funcionalidades del dashboard.
              </p>
            </div>
          </div>
        </section>

        {/* Modal de Login */}
        {showLogin && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-amber-200/50 relative max-w-md w-full animate-scale-in">
              <button
                onClick={toggleLogin}
                className="absolute top-4 right-4 p-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="p-8">
            <div className="text-center mb-8">
                  <div className="relative group/login-logo mx-auto mb-4">
                    {/* Círculo dorado con gradiente premium */}
                    <div className="w-16 h-16 bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 rounded-full flex items-center justify-center shadow-lg group-hover/login-logo:shadow-xl transition-all duration-300 group-hover/login-logo:scale-110 relative overflow-hidden border-2 border-amber-300/50">
                      {/* Efecto de brillo interno */}
                      <div className="absolute inset-1 bg-gradient-to-br from-white/20 to-transparent rounded-full" />
                      
                      {/* Logo */}
                      <div className="relative z-10 w-8 h-8 flex items-center justify-center">
                        <Image
                          src="/assets/images/smarthotels-logo.png"
                          alt="SmartHotels Logo"
                          width={32}
                          height={32}
                          className="w-8 h-8 object-contain filter drop-shadow-sm scale-150"
                          priority
                          onError={(e) => {
                            console.log('Error loading modal logo:', e);
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                      
                      {/* Efecto de brillo deslizante en hover */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover/login-logo:translate-x-full transition-transform duration-500 rounded-full" />
                    </div>
                    
                    {/* Anillo decorativo */}
                    <div className="absolute -inset-1 border border-amber-300/40 rounded-full animate-gentle-pulse" />
                  </div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                    Acceder al Dashboard
                  </h2>
                  <p className="text-slate-600 mt-2">
                    Inicia sesión para acceder a tu panel ejecutivo
                  </p>
                </div>
            
            <form onSubmit={handleLogin} className="space-y-6">
                  <div className="space-y-2">
                    <label htmlFor="email" className="block text-sm font-semibold text-slate-700">
                      Email
                </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                        id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onClick={handleInputClick}
                        className="w-full pl-10 pr-4 h-12 border-2 border-slate-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 rounded-lg transition-all duration-300"
                  required
                  disabled={loading || success}
                />
                    </div>
              </div>
              
                  <div className="space-y-2">
                    <label htmlFor="password" className="block text-sm font-semibold text-slate-700">
                      Contraseña
                </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onClick={handleInputClick}
                        className="w-full pl-10 pr-10 h-12 border-2 border-slate-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 rounded-lg transition-all duration-300"
                  required
                  disabled={loading || success}
                />
                  <button
                        type="button"
                        onClick={() => {
                          setShowPassword(!showPassword);
                          playClick();
                        }}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
              </div>

                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-red-800 text-sm">{error}</p>
                    </div>
                  )}
              
              <Button 
                type="submit" 
                    className="w-full h-12 bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-white font-semibold rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading || success}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Iniciando sesión...</span>
                  </div>
                ) : success ? (
                  <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                    <span>¡Sesión iniciada!</span>
                  </div>
                ) : (
                      <div className="flex items-center gap-2">
                        <span>Iniciar Sesión</span>
                        <ArrowRight className="w-4 h-4" />
                      </div>
                )}
              </Button>
                </form>

                <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-slate-500 font-medium">o</span>
                  </div>
              </div>

              <Button 
                type="button"
                variant="outline"
                onClick={handleDemoLogin}
                  className="w-full h-12 border-2 border-amber-200 text-amber-700 hover:bg-amber-50 hover:border-amber-300 transition-all duration-300 hover:scale-105 font-semibold relative overflow-hidden group"
                disabled={loading || success}
              >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-100 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500" />
                  <div className="flex items-center gap-2 relative z-10">
                    <Zap className="w-4 h-4 animate-pulse" />
                    <span>Probar Demo Ahora</span>
                  </div>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Sección de características */}
        <section id="features" className="py-20 bg-white/50 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-slate-800 mb-6">
                ¿Por qué elegir SmartHotels?
              </h2>
              <p className="text-xl text-slate-600 max-w-3xl mx-auto">
                Revoluciona la gestión hotelera con tecnología y análisis en tiempo real
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="feature-card p-6 bg-white/80 backdrop-blur-xl rounded-2xl border border-amber-200/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
                <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-3 text-center">Más Reservas</h3>
                <p className="text-slate-600 text-center leading-relaxed text-sm">Respuestas rápidas que convierten consultas en reservas confirmadas sin perder oportunidades.</p>
                <div className="mt-3 flex justify-center">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 rounded-full text-green-800 text-xs font-semibold">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                    Conversión Directa
                  </div>
                </div>
              </div>

              <div className="feature-card p-6 bg-white/80 backdrop-blur-xl rounded-2xl border border-amber-200/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Users className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-3 text-center">Equipo Optimizado</h3>
                <p className="text-slate-600 text-center leading-relaxed text-sm">La tecnología hace el trabajo pesado para que tu equipo se enfoque en lo importante.</p>
                <div className="mt-3 flex justify-center">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 rounded-full text-blue-800 text-xs font-semibold">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                    Eficiencia Total
                  </div>
                </div>
              </div>

              <div className="feature-card p-6 bg-white/80 backdrop-blur-xl rounded-2xl border border-amber-200/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Star className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-3 text-center">Mejor Imagen</h3>
                <p className="text-slate-600 text-center leading-relaxed text-sm">Atención profesional que mejora la reputación y genera reseñas positivas de huéspedes.</p>
                <div className="mt-3 flex justify-center">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-100 rounded-full text-purple-800 text-xs font-semibold">
                    <span className="w-1.5 h-1.5 bg-purple-500 rounded-full"></span>
                    Reputación Premium
                  </div>
                </div>
              </div>

              <div className="feature-card p-6 bg-white/80 backdrop-blur-xl rounded-2xl border border-amber-200/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
                <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-3 text-center">Más Ingresos</h3>
                <p className="text-slate-600 text-center leading-relaxed text-sm">Ofertas personalizadas que aumentan el valor promedio por reserva de forma natural.</p>
                <div className="mt-3 flex justify-center">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 rounded-full text-amber-800 text-xs font-semibold">
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                    Mayor Rentabilidad
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Sección Contacto */}
        <section id="about" className="py-20 bg-gradient-to-br from-slate-50 to-amber-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-slate-800 mb-6">
                Contacto
              </h2>
              <p className="text-xl text-slate-600 max-w-3xl mx-auto">
                Contacta al equipo detrás de la revolución en la gestión hotelera
              </p>
            </div>
            
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Foto del fundador */}
              <div className="text-center lg:text-left">
                <div className="relative inline-block mb-8">
                  <div className="w-80 h-80 rounded-full overflow-hidden shadow-2xl border-4 border-amber-200 mx-auto lg:mx-0">
                    <Image
                      src="/assets/images/founder.jpg"
                      alt="Fundador de SmartHotels"
                      width={450}
                      height={450}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {/* Iconos de contacto */}
                  <div className="absolute -bottom-4 -right-4 flex gap-2">
                    {/* Icono de LinkedIn */}
                    <a 
                      href="https://www.linkedin.com/in/sergio-barbero-garcia" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
                    >
                      <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                      </svg>
                    </a>
                    
                    {/* Icono de Email (mailto) */}
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        const subject = encodeURIComponent('Sobre SmartHotels');
                        const body = encodeURIComponent('Hola Sergio,\n\n');
                        const mailtoLink = `mailto:sergio@smarthotels.es?subject=${subject}&body=${body}`;
                        window.open(mailtoLink, '_blank');
                      }}
                      className="w-16 h-16 bg-gradient-to-br from-slate-600 to-slate-700 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 cursor-pointer"
                      title="Abrir en tu cliente de correo"
                    >
                      <Mail className="w-8 h-8 text-white" />
                    </a>
                    
                    {/* Icono de Gmail (enlace directo) */}
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        const subject = encodeURIComponent('Sobre SmartHotels');
                        const body = encodeURIComponent('Hola Sergio,\n\n');
                        const gmailLink = `https://mail.google.com/mail/?view=cm&fs=1&to=sergio@smarthotels.es&su=${subject}&body=${body}`;
                        window.open(gmailLink, '_blank');
                      }}
                      className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 cursor-pointer"
                      title="Abrir en Gmail"
                    >
                      <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-.904.732-1.636 1.636-1.636h3.819L12 8.73l6.545-4.909h3.819c.904 0 1.636.732 1.636 1.636z"/>
                      </svg>
                    </a>
                  </div>
                </div>
              </div>

              {/* Información del fundador */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-3xl font-bold text-slate-800 mb-2">Sergio Barbero</h3>
                  <p className="text-xl text-amber-600 font-semibold mb-2">Fundador de SmartHotels</p>
                  <div className="flex items-center gap-2 text-slate-600 mb-4">
                    <Mail className="w-5 h-5 text-amber-500" />
                    <a 
                      href="mailto:sergio@smarthotels.es"
                      className="text-slate-700 hover:text-amber-600 transition-colors font-medium"
                    >
                      sergio@smarthotels.es
                    </a>
                  </div>
                </div>
                
                <div className="space-y-4 text-slate-600 leading-relaxed">
                  <p>
                    No me gustan las descripciones grandilocuentes. Resuelvo problemas reales 
                    y ayudo a los hoteles a generar más ingresos mientras reducen costes operativos. 
                    Mi trabajo se mide en resultados, no en palabras.
                  </p>
                  <p>
                    Nuestra tecnología potencia la experiencia humana, no la reemplaza. 
                  </p>
                  <p>
                    Soy físico, programador y tengo experiencia demostrada aplicando inteligencia artificial a negocios.
                    Me encanta lo que hago, y tengo la libertad de poder decirlo de verdad.
                    Siempre estoy abierto a conocer, ayudar y avanzar con vosotros en el sector.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-slate-800 text-white py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-3 gap-8">
              {/* Columna 1: Logo y LinkedIn */}
              <div>
                <div className="flex items-center space-x-3 mb-4">
                  <div className="relative group/footer-logo">
                    {/* Círculo dorado con gradiente premium */}
                    <div className="w-12 h-12 bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 rounded-full flex items-center justify-center shadow-lg group-hover/footer-logo:shadow-xl transition-all duration-300 group-hover/footer-logo:scale-110 relative overflow-hidden border-2 border-amber-300/50">
                      {/* Efecto de brillo interno */}
                      <div className="absolute inset-1 bg-gradient-to-br from-white/20 to-transparent rounded-full" />
                      
                      {/* Logo */}
                      <div className="relative z-10 w-8 h-8 flex items-center justify-center">
                        <Image
                          src="/assets/images/smarthotels-logo.png"
                          alt="SmartHotels Logo"
                          width={32}
                          height={32}
                          className="w-8 h-8 object-contain filter drop-shadow-sm scale-150"
                          priority
                          onError={(e) => {
                            console.log('Error loading footer logo:', e);
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                      
                      {/* Efecto de brillo deslizante en hover */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover/footer-logo:translate-x-full transition-transform duration-500 rounded-full" />
                    </div>
                    
                    {/* Anillo decorativo */}
                    <div className="absolute -inset-1 border border-amber-300/40 rounded-full animate-gentle-pulse" />
                  </div>
                  <span className="text-xl font-bold relative">
                    <span className="bg-gradient-to-r from-slate-200 via-white to-slate-200 bg-clip-text text-transparent relative z-10">
                      SmartHotels
                    </span>
                    {/* Efecto de brillo dorado sutil */}
                    <span className="absolute inset-0 bg-gradient-to-r from-amber-400/20 via-amber-500/30 to-amber-400/20 bg-clip-text text-transparent blur-sm">
                      SmartHotels
                    </span>
                  </span>
                </div>
                <p className="text-slate-300 mb-4">
                  Revolucionando la gestión hotelera con correos automáticos y análisis en tiempo real.
                </p>
                
                {/* Botón de LinkedIn de la empresa */}
                <a
                  href="https://www.linkedin.com/company/smarthotels"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                  <span>Síguenos en LinkedIn</span>
                </a>
              </div>
              
              {/* Columna 2: Enlaces */}
              <div>
                <h4 className="text-lg font-semibold mb-4">Acceso</h4>
                <ul className="space-y-2 text-slate-300">
                  <li><a href="#features" className="hover:text-amber-400 transition-colors">Características</a></li>
                  <li>
                    <a 
                      href="#" 
                      onClick={(e) => {
                        e.preventDefault();
                        const subject = encodeURIComponent('Sobre SmartHotels');
                        const body = encodeURIComponent('Hola Sergio,\n\n');
                        const mailtoLink = `mailto:sergio@smarthotels.es?subject=${subject}&body=${body}`;
                        window.open(mailtoLink, '_blank');
                      }}
                      className="hover:text-amber-400 transition-colors cursor-pointer"
                    >
                      Contacto
                    </a>
                  </li>
                </ul>
              </div>
              
              {/* Columna 3: Botones */}
              <div>
                <h4 className="text-lg font-semibold mb-4">Acciones</h4>
                <div className="space-y-3">
                  <Button
                    onClick={toggleLogin}
                    variant="outline"
                    className="w-full border-amber-200 text-amber-700 hover:bg-amber-50 hover:border-amber-300"
                  >
                    <Lock className="w-4 h-4 mr-2" />
                    Iniciar Sesión
                  </Button>
                  
                  <Button
                    onClick={handleDemoLogin}
                    className="w-full bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-white font-semibold relative overflow-hidden group"
                    disabled={loading}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500" />
                    <Zap className="w-4 h-4 mr-2 animate-pulse" />
                    <span className="relative z-10">Probar Demo Ahora</span>
                  </Button>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-700 mt-8 pt-8 text-center text-slate-400">
              <p>&copy; 2024 SmartHotels. Todos los derechos reservados.</p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}