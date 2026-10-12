import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import FindATimePage from './pages/FindATimePage'
import RoomBookingPage from './pages/RoomBookingPage'

function App() {
  return (
    <>
      <nav className="nav">
        <NavLink to="/booking">Room Booking</NavLink>
        <NavLink to="/find-a-time">Find a Time</NavLink>
      </nav>
      <main className="content">
        <Routes>
          <Route path="/" element={<Navigate to="/booking" replace />} />
          <Route path="/booking" element={<RoomBookingPage />} />
          <Route path="/find-a-time" element={<FindATimePage />} />
        </Routes>
      </main>
    </>
  )
}

export default App
