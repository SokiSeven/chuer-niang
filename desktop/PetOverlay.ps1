param([switch]$SelfTest, [string]$DshUrl = 'http://127.0.0.1:64480')

Add-Type -AssemblyName PresentationFramework
Add-Type -AssemblyName PresentationCore
Add-Type -AssemblyName WindowsBase
Add-Type -MemberDefinition @'
[DllImport("user32.dll")] public static extern int GetWindowLong(IntPtr hWnd, int nIndex);
[DllImport("user32.dll")] public static extern int SetWindowLong(IntPtr hWnd, int nIndex, int dwNewLong);
'@ -Name NativeWindow -Namespace PhotoPet

$ErrorActionPreference = 'Stop'
$script:root = Split-Path -Parent $PSScriptRoot
$script:imagePath = Join-Path $PSScriptRoot 'assets\pet.png'
$script:socksImagePath = Join-Path $PSScriptRoot 'assets\pet-socks.png'
$script:showingSocks = $false
$script:stateDir = Join-Path $env:APPDATA 'photo-pet'
$script:statePath = Join-Path $script:stateDir 'desktop.json'
$script:dshUrl = $DshUrl.TrimEnd('/')
$script:lineJob = $null
$script:hints = @(
  '主人正在 DSH 里忙活，你凑过去反驳一句。',
  '主人又敲了半天键盘，你絮叨一句。',
  '主人在改配置，你嘴硬地挑刺一句。',
  '主人半天没理你，你土里土气地喊一句。'
)
$script:localIdle = @(
  '俺看你又瞎折腾，歇会儿中不中喵。',
  '这都啥时辰了，费电败家玩意儿喵。',
  '甭光顾着敲，喝口水去喵。'
)
$script:affinity = 20
$script:lastPat = [DateTime]::MinValue
$script:pressed = $false
$script:moved = $false
$script:startPoint = $null
$script:startLeft = 0.0
$script:startTop = 0.0

if (Test-Path $script:statePath) {
  try {
    $saved = Get-Content $script:statePath -Raw | ConvertFrom-Json
    if ($null -ne $saved.left) { $script:startLeft = [double]$saved.left }
    if ($null -ne $saved.top) { $script:startTop = [double]$saved.top }
    if ($null -ne $saved.affinity) { $script:affinity = [int]$saved.affinity }
  } catch { }
}

function Get-PetStateJson {
  return (@{ left = $window.Left; top = $window.Top; affinity = $script:affinity } | ConvertTo-Json -Compress)
}

function Save-PetState {
  try {
    New-Item -ItemType Directory -Force -Path $script:stateDir | Out-Null
    Set-Content -Path $script:statePath -Value (Get-PetStateJson) -Encoding UTF8
  } catch { }
}

function Show-DesktopBubble([string]$text, [int]$seconds = 3) {
  $script:bubbleText.Text = $text
  $script:bubble.Visibility = [System.Windows.Visibility]::Visible
  $script:bubbleTimer.Stop()
  $script:bubbleTimer.Interval = [TimeSpan]::FromSeconds($seconds)
  $script:bubbleTimer.Start()
}

function Invoke-DshPost([string]$path, $payload) {
  $json = $payload | ConvertTo-Json -Compress
  return Invoke-RestMethod -Uri ($script:dshUrl + $path) -Method Post `
    -ContentType 'application/json; charset=utf-8' `
    -Body ([System.Text.Encoding]::UTF8.GetBytes($json)) `
    -TimeoutSec 5
}

function Start-PetLine {
  if ($script:lineJob -and $script:lineJob.State -eq 'Running') { return }
  $body = @{ hint = ($script:hints | Get-Random); recent = @() } | ConvertTo-Json -Compress
  try {
    $script:lineJob = Start-Job -ScriptBlock {
      param($url, $body)
      Invoke-RestMethod -Uri ($url + '/photo-pet/generate') -Method Post `
        -ContentType 'application/json; charset=utf-8' `
        -Body ([System.Text.Encoding]::UTF8.GetBytes($body)) `
        -TimeoutSec 20
    } -ArgumentList $script:dshUrl, $body
  } catch {
    $script:lineJob = $null
  }
}

function Invoke-PetReaction([double]$ratio) {
  $zone = if ($ratio -lt 0.30) { 'head' } elseif ($ratio -gt 0.88) { 'foot' } else { 'body' }
  $line = $null
  $delta = 0

  try {
    $result = Invoke-DshPost '/photo-pet/interact' @{ zone = $zone }
    if ($result.line) {
      $line = [string]$result.line
      $delta = [int]$result.delta
      if ($null -ne $result.affinity) { $script:affinity = [int]$result.affinity }
    }
  } catch { }

  if (-not $line) {
    $tables = @{
      head = @(
        @{ chance = 20; delta = -2; line = '摸你大爷摸，回去摸你娘去' },
        @{ chance = 50; delta = 2; line = '好巴适，好爽嘛' },
        @{ chance = 30; delta = 10; line = '妈呀，到顶了，老鼻子舒服了' }
      )
      foot = @(
        @{ chance = 10; delta = -3; line = '哪儿来的野猫，给爷爬，别摸玉足' },
        @{ chance = 50; delta = 4; line = '想闻吗' },
        @{ chance = 40; delta = 10; line = '舒服 巴适得板 恋足耍起嘛' }
      )
      body = @(
        @{ chance = 100; delta = -1; line = '戳啥戳，戳坏了咋整喵。' }
      )
    }
    $roll = Get-Random -Minimum 0 -Maximum 100
    $acc = 0
    foreach ($item in $tables[$zone]) {
      $acc += $item.chance
      if ($roll -lt $acc) {
        $line = $item.line
        $delta = $item.delta
        break
      }
    }
    $script:affinity = [Math]::Max(0, [Math]::Min(100, $script:affinity + $delta))
  }

  if ($zone -eq 'head') {
    $anim = New-Object System.Windows.Media.Animation.DoubleAnimation(-4, 0, [System.Windows.Duration]::new([TimeSpan]::FromMilliseconds(500)))
    $script:rotate.BeginAnimation([System.Windows.Media.RotateTransform]::AngleProperty, $anim)
  } elseif ($zone -eq 'foot') {
    $anim = New-Object System.Windows.Media.Animation.DoubleAnimation(5, 0, [System.Windows.Duration]::new([TimeSpan]::FromMilliseconds(450)))
    $script:rotate.BeginAnimation([System.Windows.Media.RotateTransform]::AngleProperty, $anim)
  } else {
    $anim = New-Object System.Windows.Media.Animation.DoubleAnimation(4, 0, [System.Windows.Duration]::new([TimeSpan]::FromMilliseconds(350)))
    $script:rotate.BeginAnimation([System.Windows.Media.RotateTransform]::AngleProperty, $anim)
  }
  if ($line) { Show-DesktopBubble $line 3 }
  Set-PetSocks ($script:affinity -ge 100)
  Save-PetState
}

$window = New-Object System.Windows.Window
$window.WindowStyle = 'None'
$window.AllowsTransparency = $true
$window.Background = [System.Windows.Media.Brushes]::Transparent
$window.Topmost = $true
$window.ShowInTaskbar = $false
$window.ResizeMode = 'NoResize'
$window.WindowStartupLocation = 'Manual'
$window.Width = 380
$window.Height = 470

$work = [System.Windows.SystemParameters]::WorkArea
$defaultLeft = $work.Right - $window.Width - 16
$defaultTop = $work.Bottom - $window.Height - 8
$window.Left = if ($script:startLeft -gt 0) { $script:startLeft } else { $defaultLeft }
$window.Top = if ($script:startTop -gt 0) { $script:startTop } else { $defaultTop }

$grid = New-Object System.Windows.Controls.Grid
$grid.Background = [System.Windows.Media.Brushes]::Transparent
$window.Content = $grid

$image = New-Object System.Windows.Controls.Image
$script:petBitmap = New-Object System.Windows.Media.Imaging.BitmapImage
$script:petBitmap.BeginInit()
$script:petBitmap.UriSource = New-Object Uri($script:imagePath)
$script:petBitmap.CacheOption = 'OnLoad'
$script:petBitmap.EndInit()
$script:socksBitmap = New-Object System.Windows.Media.Imaging.BitmapImage
$script:socksBitmap.BeginInit()
$script:socksBitmap.UriSource = New-Object Uri($script:socksImagePath)
$script:socksBitmap.CacheOption = 'OnLoad'
$script:socksBitmap.EndInit()
$image.Source = $script:petBitmap
$image.Width = 122
$image.Height = 380
$image.Stretch = 'Uniform'
$image.HorizontalAlignment = 'Center'
$image.VerticalAlignment = 'Bottom'
$image.Margin = New-Object System.Windows.Thickness(0, 0, 0, 4)
$image.Cursor = [System.Windows.Input.Cursors]::Hand
$image.RenderTransformOrigin = New-Object System.Windows.Point(0.5, 0.5)
$image.Effect = New-Object System.Windows.Media.Effects.DropShadowEffect -Property @{ BlurRadius = 18; ShadowDepth = 8; Opacity = 0.28; Color = [System.Windows.Media.Colors]::Black }
$script:scale = New-Object System.Windows.Media.ScaleTransform(1, 1)
$script:rotate = New-Object System.Windows.Media.RotateTransform(0)
$script:translate = New-Object System.Windows.Media.TranslateTransform(0, 0)
$group = New-Object System.Windows.Media.TransformGroup
$group.Children.Add($script:scale) | Out-Null
$group.Children.Add($script:rotate) | Out-Null
$group.Children.Add($script:translate) | Out-Null
$image.RenderTransform = $group
$grid.Children.Add($image) | Out-Null

function Set-PetSocks([bool]$on) {
  if ($script:showingSocks -eq $on) { return }
  $script:showingSocks = $on
  $image.Source = if ($on) { $script:socksBitmap } else { $script:petBitmap }
}
Set-PetSocks ($script:affinity -ge 100)

$script:bubble = New-Object System.Windows.Controls.Border
$script:bubble.Background = New-Object System.Windows.Media.SolidColorBrush ([System.Windows.Media.Color]::FromArgb(245, 255, 255, 255))
$script:bubble.CornerRadius = New-Object System.Windows.CornerRadius(12)
$script:bubble.Padding = New-Object System.Windows.Thickness(10, 8, 10, 8)
$script:bubble.MaxWidth = 330
$script:bubble.VerticalAlignment = 'Top'
$script:bubble.HorizontalAlignment = 'Center'
$script:bubble.Margin = New-Object System.Windows.Thickness(8, 18, 8, 0)
$script:bubble.Visibility = 'Collapsed'
$script:bubble.Effect = New-Object System.Windows.Media.Effects.DropShadowEffect -Property @{ BlurRadius = 16; ShadowDepth = 4; Opacity = 0.18; Color = [System.Windows.Media.Colors]::Black }
$script:bubbleText = New-Object System.Windows.Controls.TextBlock
$script:bubbleText.FontFamily = New-Object System.Windows.Media.FontFamily('Microsoft YaHei')
$script:bubbleText.FontSize = 13
$script:bubbleText.Foreground = New-Object System.Windows.Media.SolidColorBrush ([System.Windows.Media.Color]::FromRgb(40, 40, 40))
$script:bubbleText.TextWrapping = 'Wrap'
$script:bubble.Child = $script:bubbleText
$grid.Children.Add($script:bubble) | Out-Null

$script:bubbleTimer = New-Object System.Windows.Threading.DispatcherTimer
$script:bubbleTimer.Interval = [TimeSpan]::FromSeconds(2.8)
$script:bubbleTimer.Add_Tick({ $script:bubble.Visibility = 'Collapsed'; $script:bubbleTimer.Stop() })

$script:linePoller = New-Object System.Windows.Threading.DispatcherTimer
$script:linePoller.Interval = [TimeSpan]::FromSeconds(1)
$script:linePoller.Add_Tick({
  $job = $script:lineJob
  if (-not $job) { return }
  if ($job.State -eq 'Running') { return }
  $script:lineJob = $null
  $text = $null
  if ($job.State -eq 'Completed') {
    try {
      $out = Receive-Job -Job $job -ErrorAction Stop
      if ($out -and $out.text) { $text = [string]$out.text }
    } catch { }
  }
  Remove-Job -Job $job -Force -ErrorAction SilentlyContinue
  if ($text) { Show-DesktopBubble $text 5 }
  else { Show-DesktopBubble (($script:localIdle | Get-Random)) 3 }
})
$script:linePoller.Start()

$script:talkTimer = New-Object System.Windows.Threading.DispatcherTimer
$script:talkTimer.Interval = [TimeSpan]::FromSeconds(20)
$script:talkTimer.Add_Tick({ Start-PetLine })
$script:talkTimer.Start()

$script:firstTalk = New-Object System.Windows.Threading.DispatcherTimer
$script:firstTalk.Interval = [TimeSpan]::FromSeconds(3)
$script:firstTalk.Add_Tick({ $script:firstTalk.Stop(); Start-PetLine })
$script:firstTalk.Start()

$script:socksSync = New-Object System.Windows.Threading.DispatcherTimer
$script:socksSync.Interval = [TimeSpan]::FromSeconds(2)
$script:socksSync.Add_Tick({
  $script:socksSync.Stop()
  try {
    $w = Invoke-RestMethod -Uri ($script:dshUrl + '/photo-pet/wallet') -TimeoutSec 2
    if ($null -ne $w.affinity) {
      $script:affinity = [int]$w.affinity
      Set-PetSocks ($script:affinity -ge 100)
    }
  } catch { }
})
$script:socksSync.Start()

# float / breathe
$floatAnim = New-Object System.Windows.Media.Animation.DoubleAnimation(0, -6, [System.Windows.Duration]::new([TimeSpan]::FromSeconds(2.3)))
$floatAnim.AutoReverse = $true
$floatAnim.RepeatBehavior = [System.Windows.Media.Animation.RepeatBehavior]::Forever
$script:translate.BeginAnimation([System.Windows.Media.TranslateTransform]::YProperty, $floatAnim)
$scaleAnimX = New-Object System.Windows.Media.Animation.DoubleAnimation(1, 1.012, [System.Windows.Duration]::new([TimeSpan]::FromSeconds(1.7)))
$scaleAnimX.AutoReverse = $true
$scaleAnimX.RepeatBehavior = [System.Windows.Media.Animation.RepeatBehavior]::Forever
$script:scale.BeginAnimation([System.Windows.Media.ScaleTransform]::ScaleXProperty, $scaleAnimX)
$scaleAnimY = New-Object System.Windows.Media.Animation.DoubleAnimation(1, 1.012, [System.Windows.Duration]::new([TimeSpan]::FromSeconds(1.7)))
$scaleAnimY.AutoReverse = $true
$scaleAnimY.RepeatBehavior = [System.Windows.Media.Animation.RepeatBehavior]::Forever
$script:scale.BeginAnimation([System.Windows.Media.ScaleTransform]::ScaleYProperty, $scaleAnimY)

$image.Add_MouseLeftButtonDown({
  param($sender, $event)
  $script:pressed = $true
  $script:moved = $false
  $script:startPoint = $event.GetPosition($window)
  $script:startLeft = $window.Left
  $script:startTop = $window.Top
  $image.CaptureMouse() | Out-Null
  $event.Handled = $true
})

$image.Add_MouseMove({
  param($sender, $event)
  if (-not $script:pressed) { return }
  $point = $event.GetPosition($window)
  $dx = $point.X - $script:startPoint.X
  $dy = $point.Y - $script:startPoint.Y
  if ([Math]::Abs($dx) -gt 4 -or [Math]::Abs($dy) -gt 4) { $script:moved = $true }
  if ($script:moved) {
    $window.Left = $script:startLeft + $dx
    $window.Top = $script:startTop + $dy
  }
})

$image.Add_MouseLeftButtonUp({
  param($sender, $event)
  if (-not $script:pressed) { return }
  $script:pressed = $false
  $image.ReleaseMouseCapture()
  if ($script:moved) {
    Save-PetState
  } else {
    $ratio = $event.GetPosition($image).Y / [Math]::Max(1, $image.ActualHeight)
    Invoke-PetReaction $ratio
  }
  $event.Handled = $true
})

$menu = New-Object System.Windows.Controls.ContextMenu
$walletItem = New-Object System.Windows.Controls.MenuItem
$walletItem.Header = '钱包'
$walletItem.Add_Click({
  try {
    $w = Invoke-RestMethod -Uri ($script:dshUrl + '/photo-pet/wallet') -TimeoutSec 8
    $bal = if ($null -ne $w.balance) { '¥{0:N2}' -f [double]$w.balance } else { '读不到' }
    $text = "余额 $bal`n段位 {0}`n家底 {1}`n本会话 {2:N0} token`n今日饭量 {3:N0} token`n投喂 {4} 次`n好感 {5} {6}/100" -f `
      $w.rank.name, $w.balanceTier, [double]$w.sessionTokens, [double]$w.todayTokens, $w.feedCount, $w.level, $w.affinity
    Show-DesktopBubble $text 8
  } catch {
    Show-DesktopBubble 'DSH 没开，钱包读不到。' 3
  }
})
$resetItem = New-Object System.Windows.Controls.MenuItem
$resetItem.Header = '归位'
$resetItem.Add_Click({
  $window.Left = $defaultLeft
  $window.Top = $defaultTop
  Save-PetState
})
$exitItem = New-Object System.Windows.Controls.MenuItem
$exitItem.Header = '退出'
$exitItem.Add_Click({ $window.Close() })
$menu.Items.Add($walletItem) | Out-Null
$menu.Items.Add($resetItem) | Out-Null
$menu.Items.Add($exitItem) | Out-Null
$image.ContextMenu = $menu

$window.Add_Closed({
  try {
    $script:talkTimer.Stop()
    $script:linePoller.Stop()
    $script:firstTalk.Stop()
    $script:socksSync.Stop()
    $script:bubbleTimer.Stop()
    if ($script:lineJob) {
      Stop-Job -Job $script:lineJob -ErrorAction SilentlyContinue
      Remove-Job -Job $script:lineJob -Force -ErrorAction SilentlyContinue
      $script:lineJob = $null
    }
  } catch { }
  Save-PetState
})

# Hide from Alt+Tab / taskbar while remaining topmost.
$window.Add_SourceInitialized({
  try {
    $helper = New-Object System.Windows.Interop.WindowInteropHelper($window)
    $hwnd = $helper.Handle
    $ex = [PhotoPet.NativeWindow]::GetWindowLong($hwnd, -20)
    [PhotoPet.NativeWindow]::SetWindowLong($hwnd, -20, ($ex -bor 0x80))
  } catch { }
})

if ($SelfTest) {
  $script:testTimer = New-Object System.Windows.Threading.DispatcherTimer
  $script:testTimer.Interval = [TimeSpan]::FromSeconds(1.5)
  $script:testTimer.Add_Tick({ $script:testTimer.Stop(); $window.Close() })
  $script:testTimer.Start()
}

$app = New-Object System.Windows.Application
$app.Run($window) | Out-Null
