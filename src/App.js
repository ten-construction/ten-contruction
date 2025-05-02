import { Routes, Route } from 'react-router-dom';

import BluePrint from "./pages/blueprint/index";
import Dashboard from "./pages/dashboard/index";
import User from "./pages/user/index";
import Project from "./pages/project/index";
import Employment from "./pages/employment/index";

function App() {
  return (
    <Routes>
      <Route path='/' element = { <BluePrint /> } >
          <Route index element = { <Dashboard /> } />
          <Route path='user' element = { <User /> } />
          <Route path='project' element = { <Project /> } />
          <Route path='employment' element = { <Employment /> } />
      </Route>
    </Routes>
  );
}

export default App;
