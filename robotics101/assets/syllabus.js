/* Robotics for Beginners — syllabus.
   Single source of truth for the sidebar, the course map and prev/next links.
   A page with `ready: true` has a live file at part1/<num with '.'→'-'>-<slug>.html. */
window.R101_SYLLABUS = {
  title: { zh: 'Robotics for Beginners', en: 'Robotics for Beginners' },
  parts: [
    {
      id: 'I', status: 'live',
      zh: '数学基础', en: 'Mathematical Foundations',
      subZh: '线性代数、微积分、概率、李群与优化：机器人学的共同语言',
      subEn: 'Linear algebra, calculus, probability, Lie groups and optimization: the shared language of robotics',
      chapters: [
        { n: 1, zh: '线性代数', en: 'Linear Algebra', pages: [
          { n: '1.1', slug: 'vectors', zh: '向量', en: 'Vectors' },
          { n: '1.2', slug: 'span-basis', zh: '线性组合、张成与基', en: 'Linear Combinations, Span & Basis' },
          { n: '1.3', slug: 'matrix-as-transformation', zh: '矩阵即变换', en: 'Matrices as Transformations', ready: true, star: true },
          { n: '1.4', slug: 'matrix-multiplication', zh: '矩阵乘法即复合', en: 'Matrix Multiplication as Composition' },
          { n: '1.5', slug: 'determinant', zh: '行列式', en: 'The Determinant' },
          { n: '1.6', slug: 'inverse-rank-nullspace', zh: '逆、秩与零空间', en: 'Inverse, Rank & Null Space' },
          { n: '1.7', slug: 'dot-product', zh: '点积', en: 'The Dot Product' },
          { n: '1.8', slug: 'cross-product', zh: '叉积', en: 'The Cross Product' },
          { n: '1.9', slug: 'projection', zh: '投影与正交分解', en: 'Projection & Orthogonal Decomposition' },
          { n: '1.10', slug: 'orthogonal-rotation', zh: '正交矩阵与旋转', en: 'Orthogonal Matrices & Rotations' },
          { n: '1.11', slug: 'eigen', zh: '特征值与特征向量', en: 'Eigenvalues & Eigenvectors' },
          { n: '1.12', slug: 'svd', zh: '奇异值分解 SVD', en: 'Singular Value Decomposition', star: true },
          { n: '1.13', slug: 'least-squares', zh: '最小二乘与伪逆', en: 'Least Squares & the Pseudo-inverse' }
        ]},
        { n: 2, zh: '微积分', en: 'Calculus', pages: [
          { n: '2.1', slug: 'derivative', zh: '导数：局部线性近似', en: 'Derivatives as Local Linear Approximation' },
          { n: '2.2', slug: 'chain-rule', zh: '链式法则', en: 'The Chain Rule' },
          { n: '2.3', slug: 'integration', zh: '积分与数值积分', en: 'Integration & Numerical Integration' },
          { n: '2.4', slug: 'taylor', zh: '泰勒展开', en: 'Taylor Expansion' },
          { n: '2.5', slug: 'ode', zh: '常微分方程', en: 'Ordinary Differential Equations' }
        ]},
        { n: 3, zh: '多元与向量微积分', en: 'Multivariable & Vector Calculus', pages: [
          { n: '3.1', slug: 'partial-derivatives', zh: '多元函数与偏导', en: 'Multivariable Functions & Partial Derivatives' },
          { n: '3.2', slug: 'gradient', zh: '梯度与方向导数', en: 'Gradient & Directional Derivative' },
          { n: '3.3', slug: 'jacobian', zh: '雅可比：局部线性变换', en: 'The Jacobian: a Local Linear Map', ready: true, star: true },
          { n: '3.4', slug: 'robot-jacobian', zh: '机器人雅可比', en: 'The Robot Jacobian' },
          { n: '3.5', slug: 'hessian', zh: 'Hessian 与曲率', en: 'Hessian & Curvature' },
          { n: '3.6', slug: 'vector-fields', zh: '向量场与流', en: 'Vector Fields & Flows' }
        ]},
        { n: 4, zh: '概率', en: 'Probability', pages: [
          { n: '4.1', slug: 'random-variables', zh: '随机变量与分布', en: 'Random Variables & Distributions' },
          { n: '4.2', slug: 'bayes', zh: '条件概率与贝叶斯定理', en: 'Conditional Probability & Bayes' },
          { n: '4.3', slug: 'expectation-covariance', zh: '期望、方差与协方差', en: 'Expectation, Variance & Covariance' },
          { n: '4.4', slug: 'gaussian', zh: '高斯分布', en: 'The Gaussian Distribution' },
          { n: '4.5', slug: 'uncertainty-propagation', zh: '不确定性传播', en: 'Propagating Uncertainty' },
          { n: '4.6', slug: 'mle-map', zh: '最大似然与最大后验', en: 'Maximum Likelihood & MAP' },
          { n: '4.7', slug: 'bayes-filter', zh: '贝叶斯滤波', en: 'The Bayes Filter' },
          { n: '4.8', slug: 'kalman-filter', zh: '卡尔曼滤波与 EKF', en: 'Kalman Filter & EKF', star: true },
          { n: '4.9', slug: 'sampling', zh: '采样方法', en: 'Sampling Methods' },
          { n: '4.10', slug: 'particle-filter', zh: '粒子滤波', en: 'The Particle Filter' },
          { n: '4.11', slug: 'information-theory', zh: '信息论入门', en: 'A First Look at Information Theory' }
        ]},
        { n: 5, zh: '刚体运动与李群', en: 'Rigid-Body Motion & Lie Groups', pages: [
          { n: '5.1', slug: 'frames-poses', zh: '坐标系与位姿', en: 'Frames & Poses' },
          { n: '5.2', slug: 'rotation-representations', zh: '旋转的表示', en: 'Representing Rotations' },
          { n: '5.3', slug: 'se3', zh: '齐次变换与 SE(3)', en: 'Homogeneous Transforms & SE(3)' },
          { n: '5.4', slug: 'why-lie-groups', zh: '为什么需要李群', en: 'Why Lie Groups?' },
          { n: '5.5', slug: 'lie-algebra', zh: '李代数与 hat / vee', en: 'Lie Algebras, hat & vee' },
          { n: '5.6', slug: 'exp-log', zh: '指数映射与对数映射', en: 'The Exponential & Logarithm Maps', ready: true, star: true },
          { n: '5.7', slug: 'perturbation', zh: '扰动与流形上的求导', en: 'Perturbations & Derivatives on Manifolds' },
          { n: '5.8', slug: 'adjoint', zh: '伴随表示', en: 'The Adjoint' },
          { n: '5.9', slug: 'interpolation-uncertainty', zh: '插值与流形上的不确定性', en: 'Interpolation & Uncertainty on Manifolds' },
          { n: '5.10', slug: 'poe', zh: '指数积公式与正运动学', en: 'Product of Exponentials & Forward Kinematics' }
        ]},
        { n: 6, zh: '优化', en: 'Optimization', pages: [
          { n: '6.1', slug: 'optimization-problems', zh: '什么是优化问题', en: 'What Is an Optimization Problem?' },
          { n: '6.2', slug: 'convexity', zh: '凸性', en: 'Convexity' },
          { n: '6.3', slug: 'gradient-descent', zh: '梯度下降家族', en: 'The Gradient Descent Family', ready: true, star: true },
          { n: '6.4', slug: 'sgd', zh: '随机梯度下降', en: 'Stochastic Gradient Descent' },
          { n: '6.5', slug: 'line-search-trust-region', zh: '线搜索与信赖域', en: 'Line Search & Trust Regions' },
          { n: '6.6', slug: 'newton-gauss-newton', zh: 'Newton、Gauss-Newton 与 LM', en: 'Newton, Gauss-Newton & LM' },
          { n: '6.7', slug: 'constrained', zh: '约束优化：拉格朗日与 KKT', en: 'Constrained Optimization: Lagrange & KKT' },
          { n: '6.8', slug: 'lp-qp', zh: '线性规划与二次规划', en: 'Linear & Quadratic Programming' },
          { n: '6.9', slug: 'nonlinear-least-squares', zh: '非线性最小二乘与因子图', en: 'Nonlinear Least Squares & Factor Graphs' },
          { n: '6.10', slug: 'manifold-optimization', zh: '流形上的优化', en: 'Optimization on Manifolds' },
          { n: '6.11', slug: 'sampling-based-optimization', zh: '无梯度与采样优化', en: 'Derivative-free & Sampling-based Optimization' },
          { n: '6.12', slug: 'dynamic-programming', zh: '动态规划', en: 'Dynamic Programming' },
          { n: '6.13', slug: 'trajectory-optimization', zh: '轨迹优化初探', en: 'A First Look at Trajectory Optimization' }
        ]}
      ]
    },
    {
      id: 'II', status: 'soon',
      zh: '机器人本体：运动学与动力学', en: 'Robot Mechanics: Kinematics & Dynamics',
      subZh: '连杆、关节、twist 与 wrench：机器人如何运动，又如何被驱动',
      subEn: 'Links, joints, twists and wrenches: how robots move and how they are driven',
      groups: [
        { zh: '结构与运动学', en: 'Structure & kinematics', topics: [
          ['连杆、关节与自由度', 'Links, joints & degrees of freedom'], ['构型空间', 'Configuration space'],
          ['正运动学：DH 参数与 PoE', 'Forward kinematics: DH vs. PoE'], ['速度运动学：twist 与雅可比', 'Velocity kinematics: twists & Jacobians'],
          ['逆运动学：解析与数值', 'Inverse kinematics: analytic & numerical'], ['静力学与 wrench', 'Statics & wrenches'] ] },
        { zh: '动力学', en: 'Dynamics', topics: [
          ['拉格朗日动力学', 'Lagrangian dynamics'], ['牛顿-欧拉递推', 'Recursive Newton–Euler'], ['质量矩阵与科氏力', 'Mass matrix & Coriolis terms'],
          ['接触与摩擦', 'Contact & friction'] ] },
        { zh: '机器人形态', en: 'Embodiments', topics: [
          ['移动机器人与非完整约束', 'Mobile robots & nonholonomic constraints'], ['足式与人形机器人基础', 'Legged & humanoid basics'],
          ['抓取与灵巧手', 'Grasping & dexterous hands'], ['执行器与传感器', 'Actuators & sensors'] ] }
      ]
    },
    {
      id: 'III', status: 'soon',
      zh: '3D 视觉与几何', en: '3D Vision & Geometry',
      subZh: '从像素到三维世界：相机、对极几何、立体视觉与三维表示',
      subEn: 'From pixels to the 3D world: cameras, epipolar geometry, stereo and 3D representations',
      groups: [
        { zh: '相机与投影', en: 'Cameras & projection', topics: [
          ['针孔相机模型', 'The pinhole camera'], ['射影几何与齐次坐标', 'Projective geometry & homogeneous coordinates'],
          ['内参、外参与畸变', 'Intrinsics, extrinsics & distortion'], ['相机标定与手眼标定', 'Camera & hand–eye calibration'], ['单应性 Homography', 'Homographies'] ] },
        { zh: '多视图几何', en: 'Multi-view geometry', topics: [
          ['对极几何：本质矩阵与基础矩阵', 'Epipolar geometry: essential & fundamental matrices'], ['立体视觉与深度估计', 'Stereo vision & depth'],
          ['三角化', 'Triangulation'], ['PnP 位姿估计', 'Perspective-n-Point'], ['特征匹配与 RANSAC', 'Feature matching & RANSAC'],
          ['光束法平差 Bundle Adjustment', 'Bundle adjustment'] ] },
        { zh: '三维表示与配准', en: '3D representations & registration', topics: [
          ['点云与 ICP 配准', 'Point clouds & ICP'], ['体素、网格与 SDF', 'Voxels, meshes & SDFs'],
          ['NeRF 与 3D Gaussian Splatting', 'NeRF & 3D Gaussian Splatting'], ['3D 图形学渲染管线基础', '3D graphics pipeline basics'] ] }
      ]
    },
    {
      id: 'IV', status: 'soon',
      zh: '经典规划、控制与状态估计', en: 'Classical Planning, Control & Estimation',
      subZh: '让机器人知道自己在哪、该去哪、怎么稳稳地过去',
      subEn: 'Knowing where the robot is, where to go, and how to get there reliably',
      groups: [
        { zh: '控制', en: 'Control', topics: [
          ['PID', 'PID'], ['状态空间与稳定性', 'State space & stability'], ['LQR', 'LQR'], ['模型预测控制 MPC', 'Model Predictive Control'],
          ['阻抗与导纳控制', 'Impedance & admittance control'], ['操作空间控制', 'Operational-space control'], ['全身控制 (QP)', 'Whole-body control (QP)'] ] },
        { zh: '规划', en: 'Planning', topics: [
          ['图搜索与 A*', 'Graph search & A*'], ['采样式规划：PRM、RRT、RRT*', 'Sampling-based planning: PRM, RRT, RRT*'],
          ['轨迹优化：CHOMP、TrajOpt', 'Trajectory optimization: CHOMP, TrajOpt'], ['任务与运动规划 TAMP', 'Task & motion planning'] ] },
        { zh: '状态估计', en: 'State estimation', topics: [
          ['视觉 / 惯性里程计', 'Visual / inertial odometry'], ['SLAM 与位姿图', 'SLAM & pose graphs'], ['地图表示', 'Map representations'] ] }
      ]
    },
    {
      id: 'V', status: 'soon',
      zh: '机器学习基础', en: 'Machine Learning Foundations',
      subZh: '从监督学习到生成模型与强化学习：现代机器人学习的工具箱',
      subEn: 'From supervised learning to generative models and RL: the toolbox of modern robot learning',
      groups: [
        { zh: '基础与架构', en: 'Basics & architectures', topics: [
          ['损失、泛化与正则化', 'Losses, generalization & regularization'], ['反向传播', 'Backpropagation'],
          ['MLP 与 CNN', 'MLPs & CNNs'], ['RNN 与状态空间模型', 'RNNs & state-space models'], ['Transformer 与 Attention', 'Transformers & attention'],
          ['图神经网络 GNN', 'Graph neural networks'], ['Tokenization（含动作 token 化）', 'Tokenization (incl. action tokens)'] ] },
        { zh: '监督、无监督与自监督', en: 'Supervised, unsupervised & self-supervised', topics: [
          ['回归与分类', 'Regression & classification'], ['聚类与 PCA', 'Clustering & PCA'], ['Autoencoder', 'Autoencoders'],
          ['对比学习：SimCLR、CLIP', 'Contrastive learning: SimCLR, CLIP'], ['Masked modeling 与 JEPA', 'Masked modeling & JEPA'] ] },
        { zh: '生成模型', en: 'Generative models', topics: [
          ['VAE', 'VAEs'], ['GAN', 'GANs'], ['Normalizing Flow', 'Normalizing flows'], ['自回归模型', 'Autoregressive models'],
          ['Energy-based 模型', 'Energy-based models'], ['扩散 / Score-based 模型', 'Diffusion & score-based models'], ['Flow Matching', 'Flow matching'] ] },
        { zh: '强化学习', en: 'Reinforcement learning', topics: [
          ['MDP 与 Bellman 方程', 'MDPs & Bellman equations'], ['Value-based 方法', 'Value-based methods'], ['Policy gradient', 'Policy gradients'],
          ['Actor-Critic：PPO、SAC', 'Actor-critic: PPO, SAC'], ['Offline RL', 'Offline RL'], ['逆强化学习与偏好学习', 'Inverse RL & preference learning'] ] },
        { zh: '专题', en: 'Special topics', topics: [
          ['预训练与微调（LoRA）', 'Pre-training & fine-tuning (LoRA)'], ['Scaling law', 'Scaling laws'], ['不确定性估计', 'Uncertainty estimation'],
          ['多任务与元学习', 'Multi-task & meta-learning'] ] }
      ]
    },
    {
      id: 'VI', status: 'soon',
      zh: '机器人学习：方法与经典工作', en: 'Robot Learning: Methods & Classic Works',
      subZh: '模仿学习、强化学习与 model-based 方法，以及塑造了这个领域的经典工作',
      subEn: 'Imitation, reinforcement and model-based learning, and the works that shaped the field',
      groups: [
        { zh: '方法', en: 'Methods', topics: [
          ['模仿学习：BC、DAgger', 'Imitation learning: BC, DAgger'], ['ACT 与 Diffusion Policy', 'ACT & Diffusion Policy'],
          ['机器人强化学习与 sim-to-real', 'Robot RL & sim-to-real'], ['域随机化', 'Domain randomization'] ] },
        { zh: 'Model-based 方法', en: 'Model-based methods', topics: [
          ['学习动力学模型', 'Learning dynamics models'], ['PILCO、PETS、MBPO', 'PILCO, PETS, MBPO'], ['Dreamer 与 TD-MPC', 'Dreamer & TD-MPC'],
          ['学习模型 + MPC', 'Learned models + MPC'] ] },
        { zh: '数据与经典工作', en: 'Data & landmark works', topics: [
          ['遥操作与数据采集：ALOHA、UMI', 'Teleoperation & data: ALOHA, UMI'], ['经典工作时间线（可交互）', 'Interactive timeline of landmark works'] ] }
      ]
    },
    {
      id: 'VII', status: 'soon',
      zh: '前沿：基础模型时代', en: 'Frontiers: the Foundation-Model Era',
      subZh: 'VLA、世界模型与跨本体数据：机器人通用化的新路径',
      subEn: 'VLAs, world models and cross-embodiment data: new routes to general-purpose robots',
      groups: [
        { zh: '主题', en: 'Topics', topics: [
          ['大模型做规划：SayCan、Code as Policies', 'LLMs as planners: SayCan, Code as Policies'], ['Vision-Language-Action 模型', 'Vision-Language-Action models'],
          ['跨本体数据集：Open X-Embodiment', 'Cross-embodiment data: Open X-Embodiment'], ['World Model', 'World models'],
          ['人形机器人基础模型', 'Foundation models for humanoids'], ['评测与 benchmark', 'Evaluation & benchmarks'] ] }
      ]
    },
    {
      id: 'VIII', status: 'soon',
      zh: 'Agentic Robotics', en: 'Agentic Robotics',
      subZh: '会规划、会使用工具、有记忆、能自我纠错的机器人智能体',
      subEn: 'Robot agents that plan, use tools, remember, and correct themselves',
      groups: [
        { zh: '主题', en: 'Topics', topics: [
          ['以 LLM / VLM 为大脑的机器人 agent', 'LLM / VLM-driven robot agents'], ['技能库与工具调用', 'Skill libraries & tool use'],
          ['记忆与世界状态', 'Memory & world state'], ['闭环反馈与自我纠错', 'Closed-loop feedback & self-correction'],
          ['长时程任务', 'Long-horizon tasks'], ['多智能体与人机协作', 'Multi-agent & human–robot collaboration'], ['安全', 'Safety'] ] }
      ]
    }
  ]
};
