/* Robotics for Beginners — syllabus.
   Single source of truth for the sidebar, the course map and prev/next links.
   A page with `ready: true` has a live file at <part.dir>/<num with '.'→'-'>-<slug>.html (part1/…, part2/…, part4/…); chapter numbers run on across parts. */
window.R101_SYLLABUS = {
  title: { zh: 'Robotics for Beginners', en: 'Robotics for Beginners' },
  parts: [
    {
      id: 'I', status: 'live', dir: 'part1',
      zh: '数学基础', en: 'Mathematical Foundations',
      subZh: '线性代数、微积分、概率、李群与优化：机器人学的共同语言',
      subEn: 'Linear algebra, calculus, probability, Lie groups and optimization: the shared language of robotics',
      chapters: [
        { n: 1, zh: '线性代数', en: 'Linear Algebra', pages: [
          { n: '1.1', slug: 'vectors', zh: '向量', en: 'Vectors', ready: true },
          { n: '1.2', slug: 'span-basis', zh: '线性组合、张成与基', en: 'Linear Combinations, Span & Basis', ready: true },
          { n: '1.3', slug: 'matrix-as-transformation', zh: '矩阵即变换', en: 'Matrices as Transformations', ready: true, star: true },
          { n: '1.4', slug: 'matrix-multiplication', zh: '矩阵乘法即复合', en: 'Matrix Multiplication as Composition', ready: true },
          { n: '1.5', slug: 'determinant', zh: '行列式', en: 'The Determinant', ready: true },
          { n: '1.6', slug: 'inverse-rank-nullspace', zh: '逆、秩与零空间', en: 'Inverse, Rank & Null Space', ready: true },
          { n: '1.7', slug: 'dot-product', zh: '点积', en: 'The Dot Product', ready: true },
          { n: '1.8', slug: 'cross-product', zh: '叉积', en: 'The Cross Product', ready: true },
          { n: '1.9', slug: 'projection', zh: '投影与正交分解', en: 'Projection & Orthogonal Decomposition', ready: true },
          { n: '1.10', slug: 'orthogonal-rotation', zh: '正交矩阵与旋转', en: 'Orthogonal Matrices & Rotations', ready: true },
          { n: '1.11', slug: 'eigen', zh: '特征值与特征向量', en: 'Eigenvalues & Eigenvectors', ready: true },
          { n: '1.12', slug: 'svd', zh: '奇异值分解 SVD', en: 'Singular Value Decomposition', ready: true, star: true },
          { n: '1.13', slug: 'least-squares', zh: '最小二乘与伪逆', en: 'Least Squares & the Pseudo-inverse', ready: true }
        ]},
        { n: 2, zh: '微积分', en: 'Calculus', pages: [
          { n: '2.1', slug: 'derivative', zh: '导数：局部线性近似', en: 'Derivatives as Local Linear Approximation', ready: true },
          { n: '2.2', slug: 'chain-rule', zh: '链式法则', en: 'The Chain Rule', ready: true },
          { n: '2.3', slug: 'integration', zh: '积分与数值积分', en: 'Integration & Numerical Integration', ready: true },
          { n: '2.4', slug: 'taylor', zh: '泰勒展开', en: 'Taylor Expansion', ready: true },
          { n: '2.5', slug: 'ode', zh: '常微分方程', en: 'Ordinary Differential Equations', ready: true }
        ]},
        { n: 3, zh: '多元与向量微积分', en: 'Multivariable & Vector Calculus', pages: [
          { n: '3.1', slug: 'partial-derivatives', zh: '多元函数与偏导', en: 'Multivariable Functions & Partial Derivatives', ready: true },
          { n: '3.2', slug: 'gradient', zh: '梯度与方向导数', en: 'Gradient & Directional Derivative', ready: true },
          { n: '3.3', slug: 'jacobian', zh: '雅可比：局部线性变换', en: 'The Jacobian: a Local Linear Map', ready: true, star: true },
          { n: '3.4', slug: 'robot-jacobian', zh: '机器人雅可比', en: 'The Robot Jacobian', ready: true },
          { n: '3.5', slug: 'hessian', zh: 'Hessian 与曲率', en: 'Hessian & Curvature', ready: true },
          { n: '3.6', slug: 'vector-fields', zh: '向量场与流', en: 'Vector Fields & Flows', ready: true }
        ]},
        { n: 4, zh: '概率', en: 'Probability', pages: [
          { n: '4.1', slug: 'random-variables', zh: '随机变量与分布', en: 'Random Variables & Distributions', ready: true },
          { n: '4.2', slug: 'bayes', zh: '条件概率与贝叶斯定理', en: 'Conditional Probability & Bayes', ready: true },
          { n: '4.3', slug: 'expectation-covariance', zh: '期望、方差与协方差', en: 'Expectation, Variance & Covariance', ready: true },
          { n: '4.4', slug: 'gaussian', zh: '高斯分布', en: 'The Gaussian Distribution', ready: true },
          { n: '4.5', slug: 'uncertainty-propagation', zh: '不确定性传播', en: 'Propagating Uncertainty', ready: true },
          { n: '4.6', slug: 'mle-map', zh: '最大似然与最大后验', en: 'Maximum Likelihood & MAP', ready: true },
          { n: '4.7', slug: 'bayes-filter', zh: '贝叶斯滤波', en: 'The Bayes Filter', ready: true },
          { n: '4.8', slug: 'kalman-filter', zh: '卡尔曼滤波与 EKF', en: 'Kalman Filter & EKF', ready: true, star: true },
          { n: '4.9', slug: 'sampling', zh: '采样方法', en: 'Sampling Methods', ready: true },
          { n: '4.10', slug: 'particle-filter', zh: '粒子滤波', en: 'The Particle Filter', ready: true },
          { n: '4.11', slug: 'information-theory', zh: '信息论入门', en: 'A First Look at Information Theory', ready: true }
        ]},
        { n: 5, zh: '刚体运动与李群', en: 'Rigid-Body Motion & Lie Groups', pages: [
          { n: '5.1', slug: 'frames-poses', zh: '坐标系与位姿', en: 'Frames & Poses', ready: true },
          { n: '5.2', slug: 'rotation-representations', zh: '旋转的表示', en: 'Representing Rotations', ready: true },
          { n: '5.3', slug: 'se3', zh: '齐次变换与 SE(3)', en: 'Homogeneous Transforms & SE(3)', ready: true },
          { n: '5.4', slug: 'why-lie-groups', zh: '为什么需要李群', en: 'Why Lie Groups?', ready: true },
          { n: '5.5', slug: 'lie-algebra', zh: '李代数与 hat / vee', en: 'Lie Algebras, hat & vee', ready: true },
          { n: '5.6', slug: 'exp-log', zh: '指数映射与对数映射', en: 'The Exponential & Logarithm Maps', ready: true, star: true },
          { n: '5.7', slug: 'perturbation', zh: '扰动与流形上的求导', en: 'Perturbations & Derivatives on Manifolds', ready: true },
          { n: '5.8', slug: 'adjoint', zh: '伴随表示', en: 'The Adjoint', ready: true },
          { n: '5.9', slug: 'interpolation-uncertainty', zh: '插值与流形上的不确定性', en: 'Interpolation & Uncertainty on Manifolds', ready: true },
          { n: '5.10', slug: 'poe', zh: '指数积公式与正运动学', en: 'Product of Exponentials & Forward Kinematics', ready: true }
        ]},
        { n: 6, zh: '优化', en: 'Optimization', pages: [
          { n: '6.1', slug: 'optimization-problems', zh: '什么是优化问题', en: 'What Is an Optimization Problem?', ready: true },
          { n: '6.2', slug: 'convexity', zh: '凸性', en: 'Convexity', ready: true },
          { n: '6.3', slug: 'gradient-descent', zh: '梯度下降家族', en: 'The Gradient Descent Family', ready: true, star: true },
          { n: '6.4', slug: 'sgd', zh: '随机梯度下降', en: 'Stochastic Gradient Descent', ready: true },
          { n: '6.5', slug: 'line-search-trust-region', zh: '线搜索与信赖域', en: 'Line Search & Trust Regions', ready: true },
          { n: '6.6', slug: 'newton-gauss-newton', zh: 'Newton、Gauss-Newton 与 LM', en: 'Newton, Gauss-Newton & LM', ready: true },
          { n: '6.7', slug: 'constrained', zh: '约束优化：拉格朗日与 KKT', en: 'Constrained Optimization: Lagrange & KKT', ready: true },
          { n: '6.8', slug: 'lp-qp', zh: '线性规划与二次规划', en: 'Linear & Quadratic Programming', ready: true },
          { n: '6.9', slug: 'nonlinear-least-squares', zh: '非线性最小二乘与因子图', en: 'Nonlinear Least Squares & Factor Graphs', ready: true },
          { n: '6.10', slug: 'manifold-optimization', zh: '流形上的优化', en: 'Optimization on Manifolds', ready: true },
          { n: '6.11', slug: 'sampling-based-optimization', zh: '无梯度与采样优化', en: 'Derivative-free & Sampling-based Optimization', ready: true },
          { n: '6.12', slug: 'dynamic-programming', zh: '动态规划', en: 'Dynamic Programming', ready: true },
          { n: '6.13', slug: 'trajectory-optimization', zh: '轨迹优化初探', en: 'A First Look at Trajectory Optimization', ready: true }
        ]}
      ]
    },
    {
      id: 'II', status: 'live', dir: 'part2',
      zh: '机器人本体：运动学与动力学', en: 'Robot Mechanics: Kinematics & Dynamics',
      subZh: '连杆、关节、twist 与 wrench：机器人如何运动，又如何被驱动',
      subEn: 'Links, joints, twists and wrenches: how robots move and how they are driven',
      chapters: [
        { n: 7, zh: '结构与运动学', en: 'Structure & Kinematics', pages: [
          { n: '7.1', slug: 'links-joints-dof', zh: '连杆、关节与自由度', en: 'Links, Joints & Degrees of Freedom', ready: true },
          { n: '7.2', slug: 'configuration-space', zh: '构型空间', en: 'Configuration Space', ready: true },
          { n: '7.3', slug: 'forward-kinematics', zh: '正运动学：DH 参数与 PoE', en: 'Forward Kinematics: DH vs. PoE', ready: true, star: true },
          { n: '7.4', slug: 'velocity-kinematics', zh: '速度运动学：twist 与雅可比', en: 'Velocity Kinematics: Twists & Jacobians', ready: true, star: true },
          { n: '7.5', slug: 'inverse-kinematics', zh: '逆运动学：解析与数值', en: 'Inverse Kinematics: Analytic & Numerical', ready: true, star: true },
          { n: '7.6', slug: 'statics-wrenches', zh: '静力学与 wrench', en: 'Statics & Wrenches', ready: true }
        ]},
        { n: 8, zh: '动力学', en: 'Dynamics', pages: [
          { n: '8.1', slug: 'lagrangian', zh: '拉格朗日动力学', en: 'Lagrangian Dynamics', ready: true, star: true },
          { n: '8.2', slug: 'newton-euler', zh: '牛顿-欧拉递推', en: 'Recursive Newton–Euler', ready: true },
          { n: '8.3', slug: 'mass-matrix-coriolis', zh: '质量矩阵与科氏力', en: 'Mass Matrix & Coriolis Terms', ready: true },
          { n: '8.4', slug: 'contact-friction', zh: '接触与摩擦', en: 'Contact & Friction', ready: true }
        ]},
        { n: 9, zh: '机器人形态', en: 'Embodiments', pages: [
          { n: '9.1', slug: 'mobile-nonholonomic', zh: '移动机器人与非完整约束', en: 'Mobile Robots & Nonholonomic Constraints', ready: true },
          { n: '9.2', slug: 'legged-humanoid', zh: '足式与人形机器人基础', en: 'Legged & Humanoid Basics', ready: true },
          { n: '9.3', slug: 'grasping-hands', zh: '抓取与灵巧手', en: 'Grasping & Dexterous Hands', ready: true },
          { n: '9.4', slug: 'actuators-sensors', zh: '执行器与传感器', en: 'Actuators & Sensors', ready: true }
        ]}
      ]
    },
    {
      id: 'III', status: 'live', dir: 'part3',
      zh: '3D 视觉与几何', en: '3D Vision & Geometry',
      subZh: '从像素到三维世界：相机、对极几何、立体视觉与三维表示',
      subEn: 'From pixels to the 3D world: cameras, epipolar geometry, stereo and 3D representations',
      chapters: [
        { n: 10, zh: '相机与投影', en: 'Cameras & Projection', pages: [
          { n: '10.1', slug: 'pinhole', zh: '针孔相机模型', en: 'The Pinhole Camera', ready: true, star: true },
          { n: '10.2', slug: 'projective-geometry', zh: '射影几何与齐次坐标', en: 'Projective Geometry & Homogeneous Coordinates', ready: true },
          { n: '10.3', slug: 'intrinsics-extrinsics', zh: '内参、外参与畸变', en: 'Intrinsics, Extrinsics & Distortion', ready: true },
          { n: '10.4', slug: 'calibration', zh: '相机标定与手眼标定', en: 'Camera & Hand–Eye Calibration', ready: true },
          { n: '10.5', slug: 'homography', zh: '单应性 Homography', en: 'Homographies', ready: true }
        ]},
        { n: 11, zh: '多视图几何', en: 'Multi-View Geometry', pages: [
          { n: '11.1', slug: 'epipolar', zh: '对极几何：本质矩阵与基础矩阵', en: 'Epipolar Geometry: Essential & Fundamental Matrices', ready: true, star: true },
          { n: '11.2', slug: 'stereo', zh: '立体视觉与深度估计', en: 'Stereo Vision & Depth', ready: true },
          { n: '11.3', slug: 'triangulation', zh: '三角化', en: 'Triangulation', ready: true },
          { n: '11.4', slug: 'pnp', zh: 'PnP 位姿估计', en: 'Perspective-n-Point', ready: true },
          { n: '11.5', slug: 'features-ransac', zh: '特征匹配与 RANSAC', en: 'Feature Matching & RANSAC', ready: true },
          { n: '11.6', slug: 'bundle-adjustment', zh: '光束法平差 Bundle Adjustment', en: 'Bundle Adjustment', ready: true, star: true }
        ]},
        { n: 12, zh: '三维表示与配准', en: '3D Representations & Registration', pages: [
          { n: '12.1', slug: 'point-clouds-icp', zh: '点云与 ICP 配准', en: 'Point Clouds & ICP', ready: true, star: true },
          { n: '12.2', slug: 'voxels-meshes-sdf', zh: '体素、网格与 SDF', en: 'Voxels, Meshes & SDFs', ready: true },
          { n: '12.3', slug: 'graphics-pipeline', zh: '3D 图形学渲染管线基础', en: '3D Graphics Pipeline Basics', ready: true },
          { n: '12.4', slug: 'nerf-gaussian-splatting', zh: 'NeRF 与 3D Gaussian Splatting', en: 'NeRF & 3D Gaussian Splatting', ready: true, star: true }
        ]}
      ]
    },
    {
      id: 'IV', status: 'live', dir: 'part4',
      zh: '经典规划、控制与状态估计', en: 'Classical Planning, Control & Estimation',
      subZh: '让机器人知道自己在哪、该去哪、怎么稳稳地过去',
      subEn: 'Knowing where the robot is, where to go, and how to get there reliably',
      chapters: [
        { n: 13, zh: '反馈控制', en: 'Feedback Control', pages: [
          { n: '13.1', slug: 'pid', zh: 'PID 控制', en: 'PID Control', ready: true, star: true },
          { n: '13.2', slug: 'state-space-stability', zh: '状态空间与稳定性', en: 'State Space & Stability', ready: true },
          { n: '13.3', slug: 'lqr', zh: 'LQR：最优状态反馈', en: 'LQR: Optimal State Feedback', ready: true },
          { n: '13.4', slug: 'mpc', zh: '模型预测控制 MPC', en: 'Model Predictive Control', ready: true, star: true },
          { n: '13.5', slug: 'impedance-admittance', zh: '阻抗与导纳控制', en: 'Impedance & Admittance Control', ready: true },
          { n: '13.6', slug: 'operational-space', zh: '操作空间控制', en: 'Operational-Space Control', ready: true },
          { n: '13.7', slug: 'whole-body-control', zh: '全身控制（QP）', en: 'Whole-Body Control (QP)', ready: true }
        ]},
        { n: 14, zh: '运动规划', en: 'Motion Planning', pages: [
          { n: '14.1', slug: 'graph-search-astar', zh: '图搜索与 A*', en: 'Graph Search & A*', ready: true, star: true },
          { n: '14.2', slug: 'sampling-based-planning', zh: '采样式规划：PRM、RRT、RRT*', en: 'Sampling-Based Planning: PRM, RRT, RRT*', ready: true, star: true },
          { n: '14.3', slug: 'chomp-trajopt', zh: '轨迹优化：CHOMP 与 TrajOpt', en: 'Trajectory Optimization: CHOMP & TrajOpt', ready: true },
          { n: '14.4', slug: 'tamp', zh: '任务与运动规划 TAMP', en: 'Task & Motion Planning', ready: true }
        ]},
        { n: 15, zh: '状态估计与建图', en: 'State Estimation & Mapping', pages: [
          { n: '15.1', slug: 'visual-inertial-odometry', zh: '视觉 / 惯性里程计', en: 'Visual & Inertial Odometry', ready: true },
          { n: '15.2', slug: 'slam-pose-graphs', zh: 'SLAM 与位姿图', en: 'SLAM & Pose Graphs', ready: true, star: true },
          { n: '15.3', slug: 'map-representations', zh: '地图表示', en: 'Map Representations', ready: true }
        ]}
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
