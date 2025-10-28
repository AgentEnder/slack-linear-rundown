import {
  Table,
  Column,
  Model,
  DataType,
  CreatedAt,
  UpdatedAt,
} from 'sequelize-typescript';

@Table({
  tableName: 'AppConfig',
  timestamps: true,
  underscored: true,
})
export class AppConfig extends Model {
  @Column({
    type: DataType.STRING,
    primaryKey: true,
  })
  key!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  value!: string;

  @CreatedAt
  @Column({
    type: DataType.DATE,
    field: 'created_at',
  })
  created_at!: Date;

  @UpdatedAt
  @Column({
    type: DataType.DATE,
    field: 'updated_at',
  })
  updated_at!: Date;
}
