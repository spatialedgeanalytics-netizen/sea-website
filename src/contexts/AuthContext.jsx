import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else { setProfile(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    const { data } = await supabase
      .from('admin_profiles')
      .select('*')
      .eq('id', userId)
      .single()
    setProfile(data)
    if (data) {
      await supabase.from('admin_profiles').update({ is_online: true, last_seen: new Date().toISOString() }).eq('id', userId)
      reportLocation()
    }
    setLoading(false)
  }

  // Stamps this admin's audit trail entries with their device location (if they allow it)
  function reportLocation() {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => supabase.rpc('sat_report_location', {
        p_lat: coords.latitude, p_lon: coords.longitude, p_accuracy: coords.accuracy,
      }),
      () => {},
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 },
    )
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (!error) await supabase.rpc('sat_log_event', { p_action: 'LOGIN' })
    return { data, error }
  }

  async function signOut() {
    if (user) {
      await supabase.rpc('sat_log_event', { p_action: 'LOGOUT' })
      await supabase.from('admin_profiles').update({ is_online: false, last_seen: new Date().toISOString() }).eq('id', user.id)
    }
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
