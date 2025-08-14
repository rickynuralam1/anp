const role = localStorage.getItem('role')

const nav = [
  {
    component: 'CNavItem',
    name: 'Dashboard',
    to: '/dashboard',
    icon: 'cil-speedometer',
  },
  {
    component: 'CNavItem',
    name: 'Apis',
    to: '/apis',
    icon: 'cil-notes',
  },
]

// Hanya tambahkan menu ini jika role adalah admin
if (role === 'admin') {
  nav.push(
    {
      component: 'CNavGroup',
      name: 'Configuration',
      to: '#',
      icon: 'cil-settings',
      items: [
        {
          component: 'CNavItem',
          name: 'Server',
          to: '/configuration/server',
        },
        {
          component: 'CNavItem',
          name: 'Apis Template',
          to: '/configuration/template',
        }
      ],
    },
    {
      component: 'CNavItem',
      name: 'User',
      to: '/user',
      icon: 'cil-user',
    }
  )
}

export default nav
